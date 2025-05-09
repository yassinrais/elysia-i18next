import Elysia, { Context, RouteSchema } from 'elysia'
import lib, { i18n, InitOptions } from 'i18next'

export type I18NextRequest = {
  i18n: i18n
  t: i18n['t']
}

export type I18NextPluginOptions = {
  initOptions: InitOptions
  detectLanguage: LanguageDetector
  instance: null | i18n
}

export type LanguageDetectorOptions = {
  storeParamName: string
  searchParamName: string
  headerName: string
  cookieName: string
  pathParamName: string
}

export type LanguageDetector<
  T extends Context<RouteSchema> = Context<RouteSchema>,
> = (ctx: T) => null | string | Promise<string | null>

export function newLanguageDetector(opts: LanguageDetectorOptions): LanguageDetector {
  return ({ cookie, request, params, store }) => {
    const url = new URL(request.url)

    const searchParamValue = url.searchParams.get(opts.searchParamName)
    if (searchParamValue) {
      return searchParamValue
    }

    const _cookie = cookie ? cookie[opts.cookieName] : null
    if (_cookie && _cookie.value) {
      return _cookie.value as string
    }

    if (params && opts.pathParamName in params) {
      return params[opts.pathParamName]
    }

    if (opts.storeParamName in store) {
      // get opts.storeParamName from store
      return (store as Record<string, unknown>)[opts.storeParamName] as
        | string
        | null
    }

    return request.headers.get(opts.headerName)
  }
}

const defaultOptions: I18NextPluginOptions = {
  instance: null,
  initOptions: {},
  detectLanguage: newLanguageDetector({
    searchParamName: 'lang',
    storeParamName: 'language',
    headerName: 'accept-language',
    cookieName: 'lang',
    pathParamName: 'lang',
  }),
}

export const i18next = (userOptions: Partial<I18NextPluginOptions>) => (app: Elysia) => {
    const options: I18NextPluginOptions = {
      ...defaultOptions,
      ...userOptions,
    }
    return app.use(new Elysia({ name: 'elysia-i18next', seed: options })
      .derive({ as: 'global' }, async () => {
        const _instance = options.instance || lib
        if (!_instance.isInitialized) {
          await _instance.init(options.initOptions)
        }
        const _clone = _instance.cloneInstance()
        return { i18n: _clone, t: _clone.t }
      })
      .onBeforeHandle({ as: "global" }, async ctx => {
        const lng = await options.detectLanguage(ctx)
        if (lng) {
          await ctx.i18n.changeLanguage(lng)
        }
      })
    )
}
