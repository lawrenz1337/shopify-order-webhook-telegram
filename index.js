require('dotenv').config()
const functions = require('@google-cloud/functions-framework')
const { Telegraf } = require('telegraf')
const { createHmac } = require('crypto')
const { SIGNATURE, TELEGRAM_TOKEN, RECIPIENT, RECIPIENT2, SHOP_ADMIN_LINK, MENTIONS } = process.env

const verifyHeaders = (data, hmacHeader) => {
  if (!data || !hmacHeader) {
    return false
  }
  const hash = createHmac('sha256', SIGNATURE)
    .update(data, 'utf8', 'hex')
    .digest('base64')
  return hash === hmacHeader
}

const topics = {
  'orders/create': ({ order, bot }) => {
    const message = `
          <b>New Order</b>
          - <b>Order ID</b>: ${order.id}
          - <b>Order Number</b>: ${order.order_number}
          - <b>Total Price</b>: ${order.total_price} ${order.currency}
          - <b>Client Phone</b>: <code>${order.phone} or ${order.customer?.phone} or ${order.customer?.default_address?.phone}</code>
          ${SHOP_ADMIN_LINK ? `<a href="${SHOP_ADMIN_LINK}/orders/${order.id}"><i>Order Link</i></a>` : ''}
        `

    bot.telegram.sendMessage(RECIPIENT, message, { parse_mode: 'HTML' })
    if (Number(order.total_price) > 0) {
      bot.telegram.sendMessage(RECIPIENT2, message, { parse_mode: 'HTML' })
    }
  },
  'themes/publish': ({ bot }) => {
    bot.telegram.sendMessage(
      RECIPIENT,
        `A new theme version has been published ${MENTIONS}`
    )
  },
  'themes/update': ({ bot }) => {
    bot.telegram.sendMessage(
      RECIPIENT,
      'An update was made to a theme'
    )
  },
  'carts/update': ({ bot, order: cart }) => {
    const newPrice = cart.line_items.reduce((p, c) => parseFloat(p) + parseFloat(c.line_price), 0)
    if (newPrice > 0) {
      const message = `
        <b>Cart ${cart.id.substring(0, 4)} has been updated</b>
        - <b>New price</b>: ${newPrice}
      `
      bot.telegram.sendMessage(RECIPIENT, message, { parse_mode: 'HTML' })
    }
  },
  'carts/create': ({ bot, order: cart }) => {
    if (cart.line_items.length > 0) {
      const message = `
        <b>Cart ${cart.id.substring(0, 4)} has been created</b>
        - <b>Number of items</b>: ${cart.line_items.length}
        - <b>Total price</b>: ${cart.line_items.reduce((p, c) => parseFloat(p) + parseFloat(c.line_price), 0)}
      `
      bot.telegram.sendMessage(RECIPIENT, message, { parse_mode: 'HTML' })
    }
  }
}

functions.http('processWebhook', (req, res) => {
  const { headers, body: order, rawBody } = req
  const bot = new Telegraf(TELEGRAM_TOKEN)

  try {
    const isVerified = verifyHeaders(
      rawBody,
      headers['x-shopify-hmac-sha256']
    )
    if (isVerified) {
      const topic = headers['x-shopify-topic']
      if (topics[topic]) {
        topics[topic]({ order, bot })
      }
    }
  } catch (e) {
    console.error(e)
  }

  res.send('OK')
})
