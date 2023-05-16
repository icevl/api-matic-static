import path from "path"

import cliProgress from "cli-progress"
import fse from "fs-extra"
import puppeteer from "puppeteer"
import xmlbuilder from "xmlbuilder"

import type { Browser, Page } from "puppeteer"

import config from "./config"

class Fetch {
  private readonly bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)

  private browser!: Browser
  private page!: Page
  private urls: Array<string> = []

  constructor(private baseUrl: string) {}

  public async start() {
    this.browser = await puppeteer.launch()
    this.page = await this.browser.newPage()

    this.onFetchListener()

    await this.fetch(this.baseUrl)
    await this.browser.close()
  }

  private async fetch(url: string) {
    this.page = await this.browser.newPage()

    await this.page.goto(url, {
      timeout: 0,
      waitUntil: "domcontentloaded"
    })

    await this.page.waitForSelector("#scroll-container", { visible: true })

    const pageUrl = this.page.url()
    const path = String(pageUrl.split("#").at(1))

    await this.expandAllSubmenus()

    if (url === this.baseUrl) {
      const links = await this.page.$$eval("a", as => as.map(a => a.href))
      const apiMaticWidgetLinks = links.filter(link => link.includes("#/")).filter((v, i, a) => a.indexOf(v) === i)

      this.urls = apiMaticWidgetLinks

      await this.buildSiteMap()
      await this.downloadAllSiteLinks()
    }

    await this.rewriteUrls()
    await this.removeScripts()
    await this.injectBasicStyles()
    await this.injectSEOPageTitle(path)

    const content = await this.page.content()
    await this.saveToFile(`${path}/index.html`, content)
  }

  private async buildSiteMap() {
    const root = xmlbuilder.create("urlset")
    root.att("xmlns", "http://www.sitemaps.org/schemas/sitemap/0.9")

    for (const url of this.urls) {
      const item = root.ele("url")
      item.ele("loc").text(url.replace("#/", "/"))
      item.ele("lastmod").text(new Date().toISOString().split("T")[0])
    }

    const xml = root.end({ pretty: true })
    await this.saveToFile("sitemap.xml", xml)
  }

  private async injectSEOPageTitle(path: string): Promise<void> {
    const sectionElement = await this.page.$(`div[name='${path}'] > * > div`)
    if (!sectionElement) return

    const sectionDescriptionElement = await this.page.$(`div[name='${path}'] + div > * > p`)
    const sectionDescriptionElement2 = await this.page.$(`div[name='${path}'] + div > p`)
    const descriptionElement = await sectionDescriptionElement?.evaluate(element => element.innerHTML)
    const descriptionElement2 = await sectionDescriptionElement2?.evaluate(element => element.innerHTML)

    const pageHeader = await sectionElement.evaluate(element => element.innerHTML)
    const documentTitle = await this.page.title()
    const newTitle = `${documentTitle} - ${pageHeader}`

    const titleElement = await this.page.$("title")
    const metaElement = await this.page.$("meta[name='Description']")

    const description = descriptionElement || descriptionElement2 || pageHeader

    await titleElement?.evaluate((element, newTitle) => (element.innerHTML = newTitle), newTitle)
    await metaElement?.evaluate((element, description) => element.setAttribute("content", description), description)
    await metaElement?.evaluate(element => element.setAttribute("name", "description"), description)
  }

  private async rewriteUrls() {
    const elements = await this.page.$$("a")

    for (const element of elements) {
      await element.evaluate((elem, baseUrl) => {
        const href = elem.href

        if (href.includes("#/")) {
          const [, path] = href.split("#/")
          const newHref = `${baseUrl}/${path}`

          elem.setAttribute("href", newHref)
        }
      }, this.baseUrl)
    }
  }

  private async removeScripts() {
    const elements = await this.page.$$("script")

    for (const element of elements) {
      await element.evaluate(elem => elem.remove())
    }
  }

  private async injectBasicStyles() {
    await this.destroyElements("link[rel='stylesheet']")

    const container = await this.page.$("div[type='column'] > div")
    await container?.evaluate(element =>
      element.setAttribute(
        "style",
        "display: grid; grid-template-columns: 40% 60%; grid-column-gap: 33px; overflow-wrap: anywhere; padding-right: 54px;"
      )
    )

    await this.destroyElements(".api-navbar")
    await this.destroyElements("div.rc-menu-submenu")

    await this.setElementsStyle("ul.rc-menu-root", "padding-left: 0;")
    await this.setElementsStyle("ul.rc-menu-item-group-list", "padding-left: 0;")
    await this.setElementsStyle("li.rc-menu-item", "padding-left: 0; font-size: 13px;")
  }

  private async setElementsStyle(selector: string, inlineStyle: string): Promise<void> {
    const elements = await this.page.$$(selector)
    for (const element of elements) {
      await element.evaluate((elem, style) => elem.setAttribute("style", style), inlineStyle)
    }
  }

  private async destroyElements(selector: string): Promise<void> {
    const elements = await this.page.$$(selector)
    for (const element of elements) {
      await element.evaluate(elem => elem.remove())
    }
  }

  private async expandAllSubmenus() {
    const elements = await this.page.$$("div.rc-menu-submenu-title")
    for (const element of elements) {
      await element.evaluate(elem => elem.click())
    }

    const elementsSubs = await this.page.$$("ul.rc-menu-collapse-active")
    for (const element2 of elementsSubs) {
      await element2.evaluate(elem => (elem.style.height = "auto"))
    }
  }

  private onFetchListener() {
    this.page.on("response", async response => {
      const status = response.status()
      if (status >= 300 && status <= 399) return

      const url = new URL(response.url())
      const data = await response.buffer()

      if (path.extname(url.pathname).trim() === "") return

      await this.saveToFile(url.pathname, data)
    })
  }

  private async downloadAllSiteLinks() {
    this.bar.start(this.urls.length, 0)

    for (let index = 0; index <= this.urls.length - 1; index += 1) {
      this.bar.update(index)
      await this.fetch(this.urls[index])
    }
    this.bar.stop()
  }

  private async saveToFile(name: string, data: string | NodeJS.ArrayBufferView) {
    const filePath = path.resolve(`./dist/${name}`)
    await fse.outputFile(filePath, data)
  }
}

new Fetch(config.apiMaticSite).start()
