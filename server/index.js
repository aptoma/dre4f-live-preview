'use strict';

// For local dev, ignore self signed certificate errors
if (!process.env.NODE_ENV) {
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const Hapi = require('@hapi/hapi');
const Boom = require('@hapi/boom');
const Joi = require('@hapi/joi');
const config = require('./config');
const {createService} = require('./dredition');

const server = Hapi.server(config.server);

start().catch((err) => {
	console.error(err.stack);
	server.stop({timeout: 5000}, () => {
		console.log('Stopped due to domain error');
		process.exit(1);
	});
});

async function start() {
	await server.register([
		require('@hapi/inert'),
	]);

	server.route({
		method: 'GET',
		path: '/',
		handler: previewHandler,
		options: {
			validate: {
				query: Joi.object({
					editionId: Joi.string(),
					userId: Joi.string(),
					apikey: Joi.string()
				})
			},
			pre: [{assign: 'apikey', method: (req) => {
					if (req.headers.authorization) {
						const [, apikey] = req.headers.authorization.split(' ');
						return apikey;
					}

					return req.query.apikey || config.dredition.apikey || '';
				}}]
		}
	});

	server.route({
		method: 'GET',
		path: '/js/{param*}',
		handler: {
			directory: {
				path: 'frontend'
			}
		}
	});


	try {
		await server.start();
		console.log('Live preview server running at:', server.info.uri);
	} catch (err) {
		console.error(err.stack);
		await server.stop({timeout: 5000});
		process.exit(1);
	}
}

'use strict';

async function previewHandler(req) {
	const apikey = req.pre.apikey;
	if (!apikey) {
		throw Boom.unauthorized();
	}

	const dredition = createService(Object.assign({}, config.dredition, {apikey: req.pre.apikey}));

	try {
		const userId = req.query.userId || config.userId;
		const firebaseConfig = await dredition.getFirebaseConfig(userId);

		return `<!DOCTYPE html>
	<html lang="en">
	  <head>
		<meta charset="UTF-8">
		<title>DrE Live Preview</title>
	  </head>
	  <body>
	  <script>
		  window.firebaseConfig = ${JSON.stringify(firebaseConfig)};
	  </script>
	  <script src="https://www.gstatic.com/firebasejs/8.9.1/firebase-app.js"></script>
	  <script src="https://www.gstatic.com/firebasejs/8.9.1/firebase-auth.js"></script>
	  <script src="https://www.gstatic.com/firebasejs/8.9.1/firebase-database.js"></script>
	  <script src="/js/app.js"></script>
	  </body>
	</html>`;
	} catch (err) {
		return `<!DOCTYPE html>
	<html lang="en">
	  <head>
		<meta charset="UTF-8">
		<title>DrE Error</title>
		<link rel="stylesheet" href="/dist/styles/styles.css"/>
	  </head>
	  <body>
	  <div class="frontpage">
		<h1>Error fetching data.</h1>
		<p>Please reload the preview, or contact support if the problem persists.</p>
		<h2>Technical details:</h2>
		<pre><code>${err.message}</code></pre>
	  </div>
	  </body>
	</html>`;
	}
}

