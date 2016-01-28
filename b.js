// Generated by CoffeeScript 1.9.1
(function() {
  var R, cleanup, client, logger, pricing, stream, uuid;

  R = require('ramda');

  uuid = require('uuid');

  stream = require('./stream');

  client = require('./client');

  pricing = require('./pricing');

  logger = require('./logger');

  cleanup = function(spread, size) {
    var buys, first, handleCancelled, handleFilled, handleMatch, handleReceived, initiateOne, log, openBuys, openSells, prices, second, tag;
    tag = "LongHaul-" + spread + "-" + size;
    console.log("LongHaul", spread, size, tag);
    log = function(data) {
      console.log(tag, data);
      return logger(data, tag);
    };
    prices = [];
    openBuys = [];
    first = [];
    second = [];
    openBuys = [];
    openSells = [];
    buys = [];
    initiateOne = function(price) {
      var order;
      order = {
        size: size,
        cancel_after: 'day',
        price: price,
        client_oid: uuid.v4()
      };
      console.log('initiateOne', price, order);
      first.push(order.client_oid);
      return client.buy(order, function(err, response) {
        var data;
        data = JSON.parse(response.body);
        console.log('initiateOne after buy', data);
        return log(data);
      });
    };
    handleMatch = function(data) {
      var max, price, take, takeEven, trade;
      trade = R.pick(['price', 'size'], data);
      prices.push(trade.price);
      prices = R.uniq(prices);
      price = parseFloat(trade.price);
      max = Math.max.apply(null, prices);
      take = pricing.buy.take(max, spread);
      if (price <= take) {
        takeEven = pricing.buy.takeEven(max, spread);
        prices = [];
        prices.push(price);
        return console.log(prices, prices.length);
      }
    };
    handleReceived = function(json) {
      if (R.contains(json.client_oid, first)) {
        R.remove(json.client_oid, first);
        openBuys.push(json.order_id);
      }
      if (R.contains(json.client_oid, second)) {
        R.remove(json.client_oid, second);
        return openSells.push(json.order_id);
      }
    };
    handleFilled = function(json) {
      var makePrice, order;
      if (R.contains(json.order_id, openBuys)) {
        R.remove(json.order_id, openBuys);
        log(json);
        if (json.price) {
          makePrice = pricing.buy.make(json.price, spread);
          order = {
            size: size,
            price: makePrice,
            client_oid: uuid.v4()
          };
          console.log('handleFilled sell order', json.price, order);
          second.push(order.client_oid);
          client.sell(order, function(err, response) {
            var data;
            data = JSON.parse(response.body);
            console.log('handleFilled after sell', data);
            return log(data);
          });
        }
      }
      if (R.contains(json.order_id, openSells)) {
        R.remove(json.order_id, openSells);
        return log(json);
      }
    };
    handleCancelled = function(json) {
      if (R.contains(json.order_id, openBuys)) {
        R.remove(json.order_id, openBuys);
        log(json);
      }
      if (R.contains(json.order_id, openSells)) {
        R.remove(json.order_id, openSells);
        return log(json);
      }
    };
    stream.on('open', function() {
      return stream.send(JSON.stringify({
        product_id: 'BTC-USD',
        type: 'subscribe'
      }));
    });
    return stream.on('message', function(data, flags) {
      var json;
      json = JSON.parse(data);
      if (json.type === 'match' && json.side === 'buy') {
        handleMatch(json);
      }
      if (json.type === 'received') {
        handleReceived(json);
      }
      if (json.type === 'done' && json.reason === 'filled') {
        return handleFilled(json);
      }
    });
  };

  module.exports = cleanup;

}).call(this);
