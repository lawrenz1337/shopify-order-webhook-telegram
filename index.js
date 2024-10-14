require('dotenv').config()
const functions = require('@google-cloud/functions-framework')
const { Telegraf } = require('telegraf')
const { createHmac } = require('crypto')
const { SIGNATURE, TELEGRAM_TOKEN, RECIPIENT, RECIPIENT2, SHOP_ADMIN_LINK, MENTIONS, ACCESS_TOKEN } = process.env

const verifyHeaders = (data, hmacHeader) => {
  if (!data || !hmacHeader) {
    return false
  }
  const hash = createHmac('sha256', SIGNATURE)
    .update(data, 'utf8', 'hex')
    .digest('base64')
  return hash === hmacHeader
}

const getCartMessage = (cart, message = 'Cart has been updated') => {
  return `
    <b>${message}</b>
    - <b>Number of items</b>: ${cart.line_items.length}
    - <b>Note</b>: ${cart.note || 'N/A'}
    - <b>Item SKU's</b>: ${cart.line_items.reduce((p, c) => {
      const SKU = c.sku ? c.sku : 'N/A'
      return p + SKU + ','
    }, '')}
    - <b>Total price</b>: ${cart.line_items.reduce((p, c) => parseFloat(p) + parseFloat(c.line_price), 0)}
  `
}

const topics = {
  'orders/create': async ({ order, bot }) => {
    const phone = order.phone || order.customer?.phone || order.customer?.default_address?.phone
    let locationName

    try {
      const locationId = order?.location_id || order?.fulfillments?.filter(ff => Boolean(ff.location_id))[0]?.location_id
      const url = `${SHOP_ADMIN_LINK}/api/2024-01/locations/${locationId}.json`
      const cleanUrl = url.replace(/([^:]\/)\/+/g, '$1')
      const result = await fetch(cleanUrl, {
        headers: {
          'X-Shopify-Access-Token': ACCESS_TOKEN
        }
      })
      const resultJson = await result.json()
      locationName = resultJson?.location?.name
    } catch (e) {
      console.log(e)
      console.log(e.message)
      console.log('Location not found', order.location_id, 'ORDER:', JSON.stringify(order))
    }

    const message = `
      <b>New Order!</b>
      - <b>Order Number</b>: ${order.order_number}
      - <b>Note</b>: ${order.note || 'N/A'}
      - <b>Item SKU's</b>: ${order.line_items.reduce((p, c) => {
        const SKU = c.sku ? c.sku : 'N/A'
        return p + SKU + ','
      }, '')}
      - <b>Total Price</b>: ${order.total_price} ${order.currency}
      - <b>Client Phone</b>: <code>${phone}</code>
      - <b>Source</b>: ${order.source_name ?? 'unknown'}
      - <b>Location</b>: ${locationName ?? 'unknown'}
      ${SHOP_ADMIN_LINK ? `<a href="${SHOP_ADMIN_LINK}/orders/${order.id}"><i>Order Link</i></a>` : ''}
    `

    const recipients = [RECIPIENT, RECIPIENT2]
    recipients.filter(Boolean).forEach((recipient) => {
      bot.telegram.sendMessage(recipient, message, { parse_mode: 'HTML' })
    })
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
      const message = getCartMessage(cart)
      bot.telegram.sendMessage(RECIPIENT, message, { parse_mode: 'HTML' })
    }
  },
  'carts/create': ({ bot, order: cart }) => {
    if (cart.line_items.length > 0) {
      const message = getCartMessage(cart, 'A new cart has been created')
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
