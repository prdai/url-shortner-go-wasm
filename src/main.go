//go:build js && wasm
// +build js,wasm

package main

import (
	"context"
	"hash/crc32"
	"io"
	"log/slog"
	"os"
	"strconv"
	"syscall/js"

	"github.com/cloudflare/cloudflare-go/v3"
	"github.com/cloudflare/cloudflare-go/v3/kv"
	"github.com/cloudflare/cloudflare-go/v3/option"
)

func getCloudflareClient() *cloudflare.Client {
	return cloudflare.NewClient(
		option.WithAPIToken(os.Getenv("CLOUDFLARE_API_TOKEN")),
	)
}

func createCheckSumForURL(url string) string {
	data := []byte(url)
	checksum := crc32.ChecksumIEEE(data)
	return strconv.FormatUint(uint64(checksum), 10)
}

func createShortURL(this js.Value, args []js.Value) any {
	url := args[0].String()
	client := getCloudflareClient()
	checkSum := createCheckSumForURL(url)
	promise := js.Global().Get("Promise")
	handler := js.FuncOf(func(this js.Value, args []js.Value) any {
		resolve := args[0]
		reject := args[1]

		go func() {
			_, err := client.KV.Namespaces.Bulk.Update(
				context.TODO(),
				os.Getenv("CLOUDFLARE_NAMESPACE_ID"),
				kv.NamespaceBulkUpdateParams{
					AccountID: cloudflare.F(os.Getenv("CLOUDFLARE_ACCOUNT_ID")),
					Body: []kv.NamespaceBulkUpdateParamsBody{{
						Key:   cloudflare.F(checkSum),
						Value: cloudflare.F(url),
					}},
				},
			)
			if err != nil {
				slog.Error(err.Error())
				reject.Invoke(err.Error())
			}
			resolve.Invoke(checkSum)
		}()
		return nil
	})
	return promise.New(handler)
}

func getRedirectURL(this js.Value, args []js.Value) any {
	checkSum := args[0].String()
	client := getCloudflareClient()
	promise := js.Global().Get("Promise")
	handler := js.FuncOf(func(this js.Value, args []js.Value) any {
		resolve := args[0]
		reject := args[1]
		go func() {
			response, err := client.KV.Namespaces.Values.Get(
				context.TODO(),
				os.Getenv("CLOUDFLARE_NAMESPACE_ID"),
				checkSum,
				kv.NamespaceValueGetParams{
					AccountID: cloudflare.F(os.Getenv("CLOUDFLARE_ACCOUNT_ID")),
				},
			)
			if err != nil {
				slog.Error(err.Error())
				reject.Invoke(err.Error())
			}
			bodyBytes, err := io.ReadAll(response.Body)
			if err != nil {
				slog.Error(err.Error())
				reject.Invoke(err.Error())
			}
			resolve.Invoke(string(bodyBytes))
		}()
		return nil
	})
	return promise.New(handler)
}

func main() {
	js.Global().Set("createShortURL", js.FuncOf(createShortURL))
	js.Global().Set("getRedirectURL", js.FuncOf(getRedirectURL))
	select {}
}
