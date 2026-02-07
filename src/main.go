package main

import (
	"context"
	"fmt"
	"hash/crc32"
	"os"

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
	return string(checksum)
}

// go:wasmexport createShortUrl
func createShortUrl(url string) string {
	client := getCloudflareClient()
	checkSum := createCheckSumForURL(url)
	response, err := client.KV.Namespaces.Bulk.Update(
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
		fmt.Errorf(err.Error())
	}
	fmt.Printf("%+v", response.JSON)
	return checkSum
}

func getRedirectUrl(checksum string) string {
	client := getCloudflareClient()
	response, err := client.KV.Namespaces.Get(
		context.TODO(),
		os.Getenv("CLOUDFLARE_NAMESPACE_ID"),
		kv.NamespaceGetParams{
			AccountID: cloudflare.F(os.Getenv("CLOUDFLARE_ACCOUNT_ID")),
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.JSON.RawJSON())
	return ""
}

func main() {}
