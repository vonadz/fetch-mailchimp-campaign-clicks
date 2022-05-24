import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import client from '@mailchimp/mailchimp_marketing';

import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const rl = readline.createInterface({ input, output });

const { MAILCHIMP_API, MAILCHIMP_SERVER } = process.env;

if (!MAILCHIMP_API || !MAILCHIMP_SERVER) {
	throw Error('Make sure API and server are set in .env, check example.env for info');
}

client.setConfig({
	apiKey: MAILCHIMP_API,
  server: MAILCHIMP_SERVER, 
});

const getDesiredListId = async (allLists) => {
	const listId = await rl.question('What list to get campaign data for? Use the id from one of the lists output above, without quotation marks.\n');
	if (!allLists.find(l => l.id === listId)) {
		console.log(`The id you input doesn't match any in the list. Try again.`);
		return getDesiredListId(allLists);
	} else {
		return listId;
	}
};

const askAboutUsingList = async () => {
	const answer = await rl.question('Do you want to get all campaigns, regardless of list? (y/n)\n');
	if (answer === 'y' || answer === 'n') {
		return answer;
	} else {
		console.log(`Looks like your answer wasn't y or n. Please try again.`);
		return askAboutUsingList();
	}
};





(async() => {

	try {
		let allCampaigns = { campaigns: [] };
		const useList = await askAboutUsingList();	
		if (useList === 'y') {
			allCampaigns = await await client.campaigns.list({ count: 1000 });	
		} else {
			console.log('Getting all lists.');
			const allLists = await client.lists.getAllLists();
			console.log('Retrieved these lists: ', allLists.lists);
			const desiredListId = await getDesiredListId(allLists.lists);
			console.log(`Getting all campaigns for list id ${desiredListId} (limited to 1000)`);
			allCampaigns = await client.campaigns.list({list_id: desiredListId, count: 1000});	
		}
		console.log(`Fetched ${allCampaigns.campaigns.length} campaigns.`);
		console.log('Fetching URL clicks for each campaign.');
		let count = 0;
		for (const campaign of allCampaigns.campaigns) {
			const clickReport = await client.reports.getCampaignClickDetails(campaign.id);
			campaign.urlClicks = clickReport.urls_clicked;
			count++;
			process.stdout.write(`\u001b[2K\u001b[0EFetched ${count}/${allCampaigns.campaigns.length} URL clicks.`)	
		}
		console.log('\nDone fetching URL clicks!');
		console.log('Writing all campaigns + clicks to file.');
		fs.writeFileSync(path.join(__dirname, `campaigns-urls-${Date.now()}.json`), JSON.stringify(allCampaigns.campaigns));
		console.log(`Data written to campaigns-urls-${Date.now()}.json in src directory.`);
	} catch (e) {
		throw e;
	} finally {
		rl.close();
	}
})();
