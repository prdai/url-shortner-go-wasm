package main

import (
	"context"
	"fmt"
	"os"

	"github.com/cloudflare/cloudflare-go/v3"
	"github.com/cloudflare/cloudflare-go/v3/kv"
	"github.com/cloudflare/cloudflare-go/v3/option"
)

func main() {
	client := cloudflare.NewClient(
		option.WithAPIToken(os.Getenv("CLOUDFLARE_API_TOKEN")),
	)
	response, err := client.KV.Namespaces.Bulk.Update(
		context.TODO(),
		os.Getenv("CLOUDFLARE_NAMESPACE_ID"),
		kv.NamespaceBulkUpdateParams{
			AccountID: cloudflare.F(os.Getenv("CLOUDFLARE_ACCOUNT_ID")),
			Body: []kv.NamespaceBulkUpdateParamsBody{{
				Key:   cloudflare.F("My-Key"),
				Value: cloudflare.F("Some string"),
			}},
		},
	)
	if err != nil {
		panic(err.Error())
	}
	fmt.Printf("%+v\n", response.JSON)
}
