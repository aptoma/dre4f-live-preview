'use strict';

const fetch = require('@brillout/fetch');
const jwtDecode = require('jwt-decode');

exports.createService = (config) => {
	return new DrEdition(config);
};

class DrEdition {
	constructor(config) {
		this.baseUrl = config.url;
		this.apikey = config.apikey;
	}

	async getFirebaseConfig(userId) {
		const firebaseConfig = await this.get(`/auth/firebase?userId=${userId}`);

		const decodedToken = jwtDecode(firebaseConfig.customToken);

		return {
			config: {
				apiKey: firebaseConfig.apiKey,
				databaseURL: firebaseConfig.databaseURL
			},
			data: {
				clientId: decodedToken.claims.accountClientId,
				userId
			},
			token: firebaseConfig.customToken
		};
	}

	async get(path) {
		const url = this.baseUrl + path;
		const response = await fetch(url, {
			headers: {
				Authorization: `apikey ${this.apikey}`,
				Accept: 'application/vnd.dredition.v11+json'
			}
		});

		return response.json();
	}
}
