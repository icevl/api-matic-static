### Deployment

- cp .env.example .env
- change .env APIMATIC_SITE config
- yarn install
- yarn start
- mkdir /home/user/apimatic-static
- scp -P 22 -r ./dist/* user@yousite.com:/home/user/apimatic-static
- configure nginx (config above)
- upload *dist/sitemap.xml* to google search console


```
map $http_user_agent $limit_bots {
     default 0;
     ~*(google|bing|yandex|msnbot) 1;
     ~*(AltaVista|Googlebot|Slurp|BlackWidow|Bot|ChinaClaw|Custo|DISCo|Download|Demon|eCatch|EirGrabber|EmailSiphon|EmailWolf|SuperHTTP|Surfbot|WebWhacker) 1;
     ~*(Express|WebPictures|ExtractorPro|EyeNetIE|FlashGet|GetRight|GetWeb!|Go!Zilla|Go-Ahead-Got-It|GrabNet|Grafula|HMView|Go!Zilla|Go-Ahead-Got-It) 1;
     ~*(rafula|HMView|HTTrack|Stripper|Sucker|Indy|InterGET|Ninja|JetCar|Spider|larbin|LeechFTP|Downloader|tool|Navroad|NearSite|NetAnts|tAkeOut|WWWOFFLE) 1;
     ~*(GrabNet|NetSpider|Vampire|NetZIP|Octopus|Offline|PageGrabber|Foto|pavuk|pcBrowser|RealDownload|ReGet|SiteSnagger|SmartDownload|SuperBot|WebSpider) 1;
     ~*(Teleport|VoidEYE|Collector|WebAuto|WebCopier|WebFetch|WebGo|WebLeacher|WebReaper|WebSauger|eXtractor|Quester|WebStripper|WebZIP|Wget|Widow|Zeus) 1;
     ~*(Twengabot|htmlparser|libwww|Python|perl|urllib|scan|Curl|email|PycURL|Pyth|PyQ|WebCollector|WebCopy|webcraw) 1;
}

location /api {
    if ($limit_bots = 0) {
      proxy_pass http://$landing_variant;
      break;
    }

    add_header Access-Control-Allow-Origin '*';
    index index.html;

    rewrite ^/api$ /<any_starting_path>/.html break;
    rewrite ^/api(.*)$ $1 break;

    root /home/user/apimatic-static;
    try_files $uri.html $uri/index.html $uri =404;
  }
```
