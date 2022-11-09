var glue = require('hyperglue')
var insertCss = require('insert-css')
var xtend = require('xtend')
var path = require('path')

var css = ".dialog-widget.background {\n  position: fixed;\n  left: 0;\n  top: 0;\n  background: rgba(0, 0, 0, 0.4);\n  z-index: 9999;\n  width: 100%;\n  height: 100%;\n}\n\n.dialog-widget.alert, .dialog-widget.confirm, .dialog-widget.prompt {\n  position: fixed;\n  left: calc(50% - 160px);\n  width: 300px;\n  top: calc(50% - 115px);\n  border: solid 1px #ddd;\n  background: whitesmoke;\n  z-index: 10000;\n  border-radius: 5px;\n  box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.5);\n  color: black;\n  padding: 15px 10px 15px 10px;\n  font-family: arial;\n}\n\n.dialog-widget img {\n  width: 40px;\n  height: 40px;\n  position: fixed;\n}\n\n.dialog-widget img[src=\"\"] {\n  display: none;\n}\n\n.dialog-widget.alert .divider, .dialog-widget.alert input, .dialog-widget.alert .cancel {\n  display: none;\n}\n\n.dialog-widget.confirm input {\n  display: none;\n}\n\n.dialog-widget.alert .ok {\n  margin-top: 15px;\n  float: right;\n}\n\n.dialog-widget input {\n  padding: 8px;\n  -webkit-appearance: none;\n  border: solid 1px #ccc;\n  border-radius: 5px;\n  margin: 15px 5px 5px 5px;\n  width: calc(100% - 16px - 2px - 10px);\n  font-size: 12px;\n}\n\n.dialog-widget .url {\n  text-align: center;\n  font-size: 18px;\n  text-overflow: ellipsis;\n  overflow: hidden;\n  white-space: nowrap;\n  font-weight: bold;\n}\n\n.dialog-widget[data-icon=\"true\"] .url {\n  margin-left: 40px;\n}\n\n.dialog-widget .title {\n  text-align: center;\n  display:block;\n  font-size: 14px;\n}\n\n.dialog-widget .divider {\n  border-top: solid 1px #ddd;\n  padding: 0;\n  margin: 15px 0 15px -10px;\n  width: calc(100% + 20px);\n}\n\n.dialog-widget .ok, .dialog-widget .cancel {\n  color: #005AFF;\n  padding: 8px;\n  width: calc(50% - 5px);\n  font-size: 13px;\n  background-color: #EBEBF1;\n  border: none;\n  border-radius: 5px;\n}\n\n.dialog-widget .ok {\n  margin-left: 5px;\n}\n"
var html = "<div class=\"dialogue-widget type\">\n  <img class=\"icon\" src=\"\">\n  <h3 class=\"url\"></h3>\n  <span class=\"title\"></span>\n  <form>\n    <input tabindex=\"1\">\n  </form>\n  <div class=\"divider\"></div>\n  <button class=\"ok\" tabindex=\"2\"></button>\n  <button class=\"cancel\" tabindex=\"3\"></button>\n</div>\n"

module.exports = dialog

function dialog (opt) {
  opt = opt || {}
  opt = {
    img: { src: opt.icon || '' },
    '.ok': opt.ok || 'OK',
    '.cancel': opt.cancel || 'Cancel',
    '.url': opt.hostname || window.location.hostname
  }

  insertCss(opt.style || css)

  return {
    alert: render.bind(opt, 'alert'),
    confirm: render.bind(opt, 'confirm'),
    prompt: render.bind(opt, 'prompt'),
    promptPassword: render.bind(opt, 'promptPassword'),
    cancel: cancelOpenDialog
  }
}

function render (type, title, defaultValue, cb) {
  var inputPassword = type === 'promptPassword'
  if (inputPassword) {
    type = 'prompt'
  }

  if (typeof title === 'function') {
    cb = title
    defaultValue = ''
    title = ''
  } else if (typeof defaultValue === 'function') {
    cb = defaultValue
    defaultValue = ''
  }

  var opt = xtend(this)
  opt['.type'] = { class: 'dialog-widget ' + type }
  opt['.title'] = {
    _html: (title || '').replace(/<[^>]+>/g).replace(/\n/, '<br>')
  }
  opt['input'] = { value: defaultValue || '' }
  if (inputPassword) {
    opt['input']['type'] = 'password'
  }
  var background = glue('<div class="dialog-widget background"></div>')
  var el = glue(html, opt)
  el.setAttribute('data-icon', !!opt.img.src)
  cancelOpenDialog.fn = cancel
  document.body.appendChild(background)
  document.body.appendChild(el)

  if (type === 'prompt') {
    var input = el.querySelector('input')
    input.focus()
    if (defaultValue) input.setSelectionRange(0, defaultValue.length)
  } else {
    el.querySelector('.cancel').focus()
  }

  eventListeners('addEventListener')

  if (!cb) {
    cb = function noop () {}
    return new Promise(function (resolve, reject) {
      cb = resolve
    })
  }

  function eventListeners (method) {
    el.querySelector('.ok')[method]('click', ok)
    el.querySelector('.cancel')[method]('click', cancel)
    el.querySelector('form')[method]('submit', ok)
    window[method]('keydown', keydown)
    window[method]('focus', supress, true)
  }

  function supress (e) {
    var node = e.target
    while (node) {
      if (node.classList && node.classList.contains('dialog-widget')) return
      node = node.parentNode
    }
    setTimeout(function () {
      e.target.blur()
    })
  }

  function cancel () {
    cb()
    cleanup()
  }

  function keydown (e) {
    if (e.keyCode === 27) cancelOpenDialog()
  }

  function ok (e) {
    e.preventDefault()
    // eslint-disable-next-line
    if (type === 'confirm' || type === 'alert') cb(true)
    if (type === 'prompt') cb(el.querySelector('input').value)
    cleanup()
  }

  function cleanup () {
    eventListeners('removeEventListener')
    document.body.removeChild(el)
    document.body.removeChild(background)
    delete cancelOpenDialog.fn
  }
}

function cancelOpenDialog () {
  if (cancelOpenDialog.fn) cancelOpenDialog.fn()
}
