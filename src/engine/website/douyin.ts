const { chromium , devices} = require('playwright');

export function main(url: string) {
    return new Promise(async function (resolve, reject) {

            const browser:any = await chromium.launch({ headless: true })
            
            const phoneD:any = devices['Desktop Edge']
            const context:any = await browser.newContext({ ...phoneD })
        
            const page:any = await context.newPage();
            
            await page.goto(url)
        
            const html = page.innerHTML("body");
            const flvurl:any = await  html.then(function(result:any){
                browser.close()
                const flv = result.match(/(http.*.flv)/g);
                resolve(flv[0]);
            }).catch(function(error:any){
                reject(error);
                browser.close();
            });
            
            resolve(flvurl);

    });
}
