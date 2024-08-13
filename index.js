const { Telegraf } = require("telegraf");
const axios = require("axios");
require("dotenv").config();
const TELEGRAM_BOT_API_KEY = process.env.TELEGRAM_BOT_API_KEY;

let CACHE = {};

const bot = new Telegraf(TELEGRAM_BOT_API_KEY);
/**
 *
 * @returns {Promise<Object | null |>}
 */
const getCoins = async () => {
  let response = null;
  const res = await new Promise(async (resolve, reject) => {
    try {
      response = await axios.get(
        "https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?limit=5000",
        {
          headers: {
            "X-CMC_PRO_API_KEY": process.env.CMC_API_KEY,
          },
        }
      );
    } catch (ex) {
      response = null;
      // error
      console.log(ex);
      reject(ex);
    }
    if (response) {
      // success
      const json = response.data;
      resolve(json);
    }
  });
  return res;
};

const numberWithCommas = (x) => {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const buildCoinDataMessage = (coinData) => {
  return `*${coinData.name}*\n\nPrice: $${numberWithCommas(
    coinData.quote.USD.price.toFixed(2)
  )}\n\nMax Supply: ${
    coinData.max_supply ? coinData.max_supply.toFixed(2) : "N/A"
  }\nCirculating Supply: ${numberWithCommas(
    coinData.circulating_supply.toFixed(2)
  )}\n\nMarket Cap: $${numberWithCommas(
    coinData.quote.USD.market_cap.toFixed(2)
  )}
  \nVolume 24h: $${numberWithCommas(
    coinData.quote.USD.volume_24h.toFixed(2)
  )}\nVolum Change 24h: ${numberWithCommas(
    coinData.quote.USD.volume_change_24h.toFixed(2)
  )}%\n\nChange 1h: ${numberWithCommas(
    coinData.quote.USD.percent_change_1h.toFixed(2)
  )}%\nChange 24h: ${numberWithCommas(
    coinData.quote.USD.percent_change_24h.toFixed(2)
  )}%\nChange 7d: ${numberWithCommas(
    coinData.quote.USD.percent_change_7d.toFixed(2)
  )}%\nChange 30d: ${numberWithCommas(
    coinData.quote.USD.percent_change_30d.toFixed(2)
  )}%\nChange 60d: ${numberWithCommas(
    coinData.quote.USD.percent_change_60d.toFixed(2)
  )}%\nChange 90d: ${numberWithCommas(
    coinData.quote.USD.percent_change_90d.toFixed(2)
  )}%`;
};

const sendCoinData = async (ctx, coinData) => {
  await ctx.reply(buildCoinDataMessage(coinData), {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "CoinMarketCap",
            url: `https://coinmarketcap.com/currencies/${coinData.slug}`,
          },
        ],
      ],
    },
  });
};

const handleCoinDataRequest = async (ctx, coin) => {
  // use cache here to avoid hitting the API too much

  CACHE[coin] = CACHE[coin] || {};

  if (CACHE[coin].timestamp && Date.now() - CACHE[coin].timestamp < 300000) {
    // use cache
    ctx.reply(
      "*Data from cache\n*" +
        `Wait for ${(
          (5 * 60 - (Date.now() - CACHE[coin].timestamp) / 1000) /
          60
        ).toFixed(2)} minutes for fresh data.`,
      {
        parse_mode: "Markdown",
      }
    );
    await sendCoinData(ctx, CACHE[coin].data);
    return;
  }

  let coins = null;
  try {
    coins = await getCoins();
    if (!coins) {
      ctx.reply("Error fetching data");
      return;
    }
  } catch (ex) {
    console.log(ex);
    ctx.reply("Error fetching data");
    return;
  }

  let coinData = coins.data.find((c) => c.symbol === coin);
  if (!coinData) {
    ctx.reply("Coin not found");
  } else {
    coins.data.forEach((c) => {
      if (!CACHE[c.symbol]) {
        CACHE[c.symbol] = {
          data: c,
          timestamp: Date.now(),
        };
      }
    });
    try {
      sendCoinData(ctx, coinData);
    } catch (ex) {
      console.log(ex);
      ctx.reply("Error sending data");
    }
  }
  return;
};

bot.hears("hi", (ctx) => ctx.reply("Hey there!"));

bot.hears(/^price \w+/i, (ctx) => {
  let coin = /price (\w+)/i.exec(ctx.message.text)[1];
  if (!coin) {
    ctx.reply("Please provide a coin symbol");
    return;
  }
  coin = coin.toUpperCase();
  handleCoinDataRequest(ctx, coin);
});

bot.command("btc", (ctx) => {
  handleCoinDataRequest(ctx, "BTC");
});
bot.command("ton", (ctx) => {
  handleCoinDataRequest(ctx, "TON");
});
bot.command("sol", (ctx) => {
  handleCoinDataRequest(ctx, "SOL");
});
bot.command("wld", (ctx) => {
  handleCoinDataRequest(ctx, "WLD");
});
bot.command("xrp", (ctx) => {
  handleCoinDataRequest(ctx, "XRP");
});
bot.command("eth", (ctx) => {
  handleCoinDataRequest(ctx, "ETH");
});
bot.command("bnb", (ctx) => {
  handleCoinDataRequest(ctx, "BNB");
});
bot.command("usdt", (ctx) => {
  handleCoinDataRequest(ctx, "USDT");
});
bot.command("usdc", (ctx) => {
  handleCoinDataRequest(ctx, "USDC");
});
bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
