const puppeteer = require('puppeteer');
const fs = require('fs-extra');

(async function main() {
    try {
        let str = 'Title;Address;Phone\n',
            count = 0;

        console.log('Launching Chrome...');
        const browser = await puppeteer.launch({
            headless: false
        });
        const page = await browser.newPage();
        page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.79 Safari/537.36');

        // Go to the site
        console.log('Navigating to site...');
        await page.goto('https://dss.virginia.gov/facility/search/cc2.cgi');

        // Wait until the submit button is available
        await page.waitForSelector('#submit');
        // Submitting an empty form returns all values in the database :)
        console.log('Clicking submit button...');
        await page.click('#submit');

        // Wait up to a minute for the button to finish submitting to the server to get our data
        console.log('...Wait for 60 seconds...');
        await page.waitFor(60000);

        // Get the target section on the page
        console.log('Geting section from page...');
        const container = await page.$('#Licensed');

        // Recursive function to get the data from each page
        const getData = async () => {
            let rows = await container.$$('tr[role=row]');

            console.log(`Extracting page ${++count}`);

            // Get the rows on the current page
            for (const row of rows) {
                let titleCell = await row.$('td:nth-child(1) a');
                let addressCell = await row.$('td:nth-child(2)');
                let phoneCell = await row.$('td:nth-child(3)');

                let title = await page.evaluate(value => value ? value.innerText : null, titleCell);
                let address = await page.evaluate(value => value ? value.innerText.replace(/[\n\r]+/g, ', ') : null, addressCell);
                let phone = await page.evaluate(value => value ? value.innerText : null, phoneCell);

                if (!!title && !!address && !!phone)
                    str += `${title};${address};${phone}\n`;
            }

            // Go to the next page
            let nextButton = await container.$('span a.paginate_button.current + a.paginate_button');
            if (!!nextButton) {
                await nextButton.click();
                await getData();
            }
        }

        console.log('Getting data...');
        await getData();

        console.log('Writing to file...');
        await fs.writeFile('contents.csv', str);

        console.log('Closing browser...');
        await browser.close();
        
        console.log('Done! :)');

    } catch (e) {
        console.log("ERROR: ", e)
        await fs.writeFile('contents.csv', e);
    }
})();