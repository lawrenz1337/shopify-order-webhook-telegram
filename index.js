require('dotenv').config()
const functions = require('@google-cloud/functions-framework')
const { Telegraf } = require('telegraf')
const { createHmac } = require('crypto')
const { SIGNATURE, TELEGRAM_TOKEN, RECIPIENT, SHOP_ADMIN_LINK, MENTIONS } = process.env

const verifyHeaders = (data, hmacHeader) => {
  const res = createHmac('sha256', SIGNATURE)
    .update(data, 'utf8', 'hex')
    .digest('base64')
  return res === hmacHeader
}

functions.http('processWebhook', (req, res) => {
  const { headers } = req
  const bot = new Telegraf(TELEGRAM_TOKEN)

  try {
    const isVerified = verifyHeaders(
      req.rawBody,
      headers['x-shopify-hmac-sha256']
    )
    if (isVerified) {
      if (headers['x-shopify-topic'] === 'orders/create') {
        const order = req.body
        const message = `
          <b>New Order</b>
          - <b>Order ID</b>: ${order.id}
          - <b>Order Number</b>: ${order.order_number}
          - <b>Total Price</b>: ${order.total_price} ${order.currency}
          - <b>Client Phone</b>: <code>${order.phone} or ${order.customer?.phone} or ${order.customer?.default_address?.phone}</code>
          ${SHOP_ADMIN_LINK ? `<a href="${SHOP_ADMIN_LINK}/orders/${order.id}"><i>Order Link</i></a>` : ''}
        `
        bot.telegram.sendMessage(RECIPIENT, message, { parse_mode: 'HTML' })
      }
      if (headers['x-shopify-topic'] === 'themes/publish') {
        bot.telegram.sendMessage(
          RECIPIENT,
            `A new theme version has been published ${MENTIONS}`
        )
      }
      if (headers['x-shopify-topic'] === 'themes/update') {
        bot.telegram.sendMessage(
          RECIPIENT,
          'An update was made to a theme'
        )
      }
    }
  } catch (e) {
    console.error(e)
  }

  res.send('OK')
})
