# shopify-order-webhook-telegram

![Contributors](https://img.shields.io/github/contributors/lawrenz1337/shopify-order-webhook-telegram?style=plastic)
![Forks](https://img.shields.io/github/forks/lawrenz1337/shopify-order-webhook-telegram)
![Stars](https://img.shields.io/github/stars/lawrenz1337/shopify-order-webhook-telegram)
![Licence](https://img.shields.io/github/license/lawrenz1337/shopify-order-webhook-telegram)
![Issues](https://img.shields.io/github/issues/lawrenz1337/shopify-order-webhook-telegram)


### Description

Welcome, in this repository you will find an example on how to properly set up a Google Cloud Function as your webhook target and send telegram messages on specific events, any forks/comments/PRs are appreciated!

### Instructions on setup

#### Required variables in `.env`
```
#To verify that requests are coming from shopify, can obtain in shopify shop settings -> webhooks 
SIGNATURE=aaaaabbbbbcccccdddddeeeee
#Telegram bot token
TELEGRAM_TOKEN=123456789:AAAABBBBCCCCDDDDEEEE
#ID of a group or user to send messages to
RECIPIENT=-123456789
```

#### Optional variables in `.env`
```
#Generates link to open a specific order
SHOP_ADMIN_LINK=https://your_shopify_shop.com/admin
#Mentions specific user in a message (can be multiple users)
MENTIONS="@AnyTelegramUser @AnotherTelegramUser"
```

#### Running locally
To start function locally please use this script `npm run start`.
To make test requests you can use any software you like: postman, insomnia, etc.
To test webhooks, expose your localhost to web via `ngrok` and put your url inside of shopify settings. 
