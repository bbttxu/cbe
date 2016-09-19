require('dotenv').config({silent: true})
Gdax = require 'gdax'
RSVP = require 'rsvp'
R = require 'ramda'

authedClient = new Gdax.AuthenticatedClient(process.env.API_KEY, process.env.API_SECRET, process.env.API_PASSPHRASE)

cancelAllOrders = ( currencies = [] )->
  new RSVP.Promise (resolve, reject)->
    promiseCancelCurrencyOrder = ( currency )->
      new RSVP.Promise (resolve, reject)->
        authedClient.cancelAllOrders { product_id: currency }, (err, results)->
          if err
            console.log 'cancelAllOrders.err', err
            reject err
          else
            resolve results.body

    cancelAllCurrencyOrders = R.map promiseCancelCurrencyOrder, currencies

    rejectPromise = ( promise )->
      reject promise

    resolveIssues = ( issues )->
      resolve issues

    RSVP.allSettled( cancelAllCurrencyOrders ).then( resolveIssues ).catch( rejectPromise )


stats = ( currencies = [] )->
  new RSVP.Promise ( resolve, reject )->
    currencyStats = ( currency )->
      new RSVP.Promise (resolve, reject)->
        publicClient = new Gdax.PublicClient currency

        callback = (err, json)->
          if err
            reject err

          obj = {}
          obj[currency] = JSON.parse json.body

          resolve obj


        publicClient.getProduct24HrStats callback

    allCurrencyStats = R.map currencyStats, currencies

    rejectPromise = ( promise )->
      reject promise

    resolveIssues = ( issues )->
      # console.log 'resolveIssues', issues
      resolve issues

    RSVP.all( allCurrencyStats ).then( resolveIssues ).catch( rejectPromise )

module.exports =
  cancelAllOrders: cancelAllOrders
  stats: stats
