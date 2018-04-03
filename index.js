import fetch from 'node-fetch';
import cheerio from 'cheerio';

const REGION = 'EU'
const RANDOM_DELAY = 100;

const REALM_PATTERN = /(.+?) \((.+?)\)/;

const realms = [];
let cookie = `_ga=GA1.2.812611576.1522085061; _gid=GA1.2.1946006543.1522085061; _identity=d3f80926d9b7218f8cfef5ea17a18ab933422b5debc050de81f17f7885030320a%3A2%3A%7Bi%3A0%3Bs%3A9%3A%22_identity%22%3Bi%3A1%3Bs%3A51%3A%22%5B282884%2C%22CPhkG6OJdyPm0sDkMeLky9lNJXW6ns41%22%2C2592000%5D%22%3B%7D; _csrf=bcec51d89d3891fb7ccd4950f2fdf82ed873dcaeb7298c426540539c3ec965bea%3A2%3A%7Bi%3A0%3Bs%3A5%3A%22_csrf%22%3Bi%3A1%3Bs%3A32%3A%22dCljPoCmpsuK08v-aigzII-tOZ9AIhFv%22%3B%7D; regionId=1de8a1f36d12d6d93b180176e811127d35fb174f75e311c5025f1fb101c6194aa%3A2%3A%7Bi%3A0%3Bs%3A8%3A%22regionId%22%3Bi%3A1%3Bs%3A2%3A%22EU%22%3B%7D; PHPSESSID=i612i1o921lib4eirh2pl9kl57; realmId=c35956fea75fcc53b23f3da3ef9c8003c66f2f29839b979117e2ae11527116e8a%3A2%3A%7Bi%3A0%3Bs%3A7%3A%22realmId%22%3Bi%3A1%3Bi%3A388%3B%7D`;

// TODO, add connected realms for duplicates: https://eu.battle.net/forums/en/wow/topic/8715582685
// Only request one server per group
// Add where and how much money I have on certain servers.

const translateRealm = (name) => {
	const translations = [
		{ name: 'Азурегос', translation: 'azuregos' },
		{ name: 'Борейская тундра', translation: 'borean-tundra' },
		{ name: 'Вечная Песня', translation: 'eversong' },
		{ name: 'Галакронд', translation: 'galakrond' },
		{ name: 'Голдринн', translation: 'goldrinn' },
		{ name: 'Гордунни', translation: 'gordunni' },
		{ name: 'Гром', translation: 'grom' },
		{ name: 'Дракономор', translation: 'fordragon' },
		{ name: 'Король-лич', translation: 'lich-king' },
		{ name: 'Пиратская бухта', translation: 'booty-bay' },
		{ name: 'Подземье', translation: 'deepholm' },
		{ name: 'Разувий', translation: 'razuvious' },
		{ name: 'Ревущий фьорд', translation: 'howling-fjord' },
		{ name: 'Свежеватель Душ', translation: 'soulflayer' },
		{ name: 'Седогрив', translation: 'greymane' },
		{ name: 'Страж Смерти', translation: 'deathguard' },
		{ name: 'Термоштепсель', translation: 'thermaplugg' },
		{ name: 'Ткач Смерти', translation: 'deathweaver' },
		{ name: 'Черный Шрам', translation: 'blackscar' },
		{ name: 'Ясеневый лес', translation: 'ashenvale' },
	]

	const translate = translations.reduce((acc, realm) => {
		if (realm.name === name) acc = realm.translation;

		return acc;
	}, undefined);

	return translate ? translate : name;
}

const parseTime = time => {
	switch(time) {
		case 'Short': return '0-30m';
		case 'Medium': return '30m-2h';
		case 'Long': return '2h-12h';
		case 'Very Long': return '12h-48h';
	}
}

fetch('https://www.tradeskillmaster.com/black-market', {
	credentials: 'include',
	headers: {
		'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36',
	}
})
	.then(response => {
		cookie = `${response.headers.get('set-cookie')}; _identity=d3f80926d9b7218f8cfef5ea17a18ab933422b5debc050de81f17f7885030320a%3A2%3A%7Bi%3A0%3Bs%3A9%3A%22_identity%22%3Bi%3A1%3Bs%3A51%3A%22%5B282884%2C%22CPhkG6OJdyPm0sDkMeLky9lNJXW6ns41%22%2C2592000%5D%22%3B%7D;`;

		return response;
	})
	.then(response => response.text())
	.catch(error => console.error(error))
	.then(text => new Promise(resolve => {
		const $ = cheerio.load(text);

		$('select#realmSelect option').each((_, option) => {
			const realm = $(option).text();
			const id = $(option).val();

			if (REALM_PATTERN.test(realm)) {
				const [, name, region] = REALM_PATTERN.exec(realm);

				realms.push({
					name,
					region,
					tsmId: id,
					items: []
				});
				// console.log('MATCCH')
			}
			// console.log('!!!!!', /(.+?) \((.+?)\)/.exec($(element).text()), $(element).text(), $(element).val());
		});
		console.log(realms.length)
		resolve(realms)
	}))
	.then(async realms => {
		const response = await fetch('https://eu.battle.net/forums/en/wow/topic/8715582685#post-1', {});
		const text = await response.text();
		const $ = cheerio.load(text);

		const euRealms = realms
			.filter(realm => realm.region === REGION)

		$('.TopicPost-bodyContent ul li').each((_, item) => {
			const connecteds = $(item).text().split(/[ ]*\/[ ]*/);

			for (const realm of euRealms) {
				if (connecteds.includes(realm.name)) {
					realm.connected = connecteds.filter(connected => connected !== realm.name)
				}
			}
		})

		const whitelist = ['Twilight\'s Hammer', 'C\'thun'];
		const memory = [];
		const reducedRealms = euRealms
			.reduce((acc, realm) => {
				if (!memory.includes(realm.name)) {
					const connecteds = realm.connected ? [ ...realm.connected, realm.name ] : [];
					const whitelisted = connecteds.filter(item => whitelist.includes(item))
					const duplicates = connecteds.filter(item => !whitelist.includes(item))

					if (!whitelisted.length || whitelisted.includes(realm.name)) {
						memory.push(...[...duplicates, realm.name]);

						acc.push(realm);
					}
				}

				return acc;
			}, []);

		return reducedRealms;
	})
	.then(async realms => {
		const promises = realms
			.filter(realm => realm.region === REGION)
			.map(realm => {
				return () => new Promise(resolve => {
					setTimeout(() => {
						fetch(`https://www.tradeskillmaster.com/black-market?realm=${encodeURIComponent(realm.region)}-${encodeURIComponent(translateRealm(realm.name))}`, {
							headers: {
								'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36',
								'Cookie': cookie,
							}
						})
							.then(res => res.text())
							.catch(error => console.error(error))
							.then(text => {
								const $ = cheerio.load(text);

								const items = [];
								$('#bmah_pjax a[href^="/items"]').each((_, anchor) => {
									const item = $(anchor).data();
									item.name = $(anchor).attr('title');
									$(anchor).parent().nextAll().each((_, data) => {
										switch($(data).data('col-seq')) {
											case 1: item.bid = $(data).text(); break;
											case 2: item.low = $(data).text(); break;
											case 3: item.time = parseTime($(data).text()); break;
											case 4: item.bids = $(data).text(); break;
										}
									})

									items.push(item)
								});

								realm.items = items;
								
								resolve(realm)
							})
					}, Math.ceil(Math.random() * 10) * Math.floor(RANDOM_DELAY / 10))
				})
			})
		console.log(promises.length)
		for (const promise of promises) {
			const realm = await promise();

			console.log(`Found ${realm.items.length ? realm.items.length : '-'} item(s) on ${realm.name}${realm.connected ? ` (${realm.connected.join(', ')})` : ''}`);
			for (const item of realm.items) {
				const interest = item.name.startsWith('Plague') || false;

				if (interest) console.log(`  ${interest ? '*' : ' '} ${item.name}: ${item.bid} (#${item.bids}, ${item.time})`)
			}
		}
		/*.reduce(async (promises, promise) => {
			const res = await promise();
			console.log(res);
			//return promises.then(results => promise.then(Array.prototype.concat.bind(results))), Promise.resolve([])
		})*/
		/*.then(results => {
			console.log('done')
		})*/
	})
	.catch(err => console.error(err))
	.then(() => console.log('DONE'))

/*fetch('https://www.tradeskillmaster.com/black-market?realm=EU-Kazzak', {})
	.then(res => res.text())
	.then(body => {
		const $ = cheerio.load(body);
		$('#bmah_pjax a[href^="/items"]').each((_, element) => {
			console.log('!!!!!', $(element).html(), $(element).data(), $(element).attr('title'));
		});
		console.log($('#bmah_pjax').find('a[href^="/items"]').length)
	})
	.catch(err => console.error(err))*/