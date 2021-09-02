/* global firebase*/
window.onload = () => {
	(async (firebaseConfig) => {
		const searchParams = new URLSearchParams(document.location.search);
		const editionId = searchParams.get('editionId');

		if (!editionId) {
			document.body.innerHTML = '<div class="content-area">No edition id provided</div>';
			return;
		}

		await init(firebase, firebaseConfig.config, firebaseConfig.token, firebaseConfig.data, editionId);
	})(window.firebaseConfig, window.context);
};


function createView() {
	const bodyNode = document.body;
	bodyNode.innerHTML = `
<div id="status-bar" class="status-bar">
	<div id="status" class="status"></div>
</div>
<div class="loading-info">
	<div class="two-spinner"></div>
	<div id="connection-status" class="connection-status"></div>
</div>
<div class="data" style="white-space: pre; background: antiquewhite; padding: 5px; font-size: 12px; font-family: monospace"></div>`;

	const connectionStatusNode = document.getElementById('connection-status');
	const statusNode = document.getElementById('status');
	const dataNode = document.querySelector('.data');

	return {
		render: (state) => {
			bodyNode.classList.add('realtime');
			bodyNode.classList.toggle('realtime__loading', state.loading);
			bodyNode.classList.toggle('realtime__connecting', state.connecting);
			bodyNode.classList.toggle('realtime__connected', state.connected);
			bodyNode.classList.toggle('realtime__connection-failure', state.connectionFailure);
			connectionStatusNode.innerHTML = state.connectionStatus;
			statusNode.innerHTML = state.status;
			dataNode.innerHTML = state.data
		},
		highlightItem: (itemId) => {
			// const itemEl = someCodeToFindItemById(itemId);
			// itemEl.scrollIntoView({behavior: 'auto', block: 'center', inline: 'center'});
		}
	};
}

async function init(firebase, config, firebaseToken, {clientId, userId}, editionId) {
	const view = createView();
	const state = {
		loading: true,
		connecting: true,
		connected: false,
		connectionFailure: false,
		connectionStatus: 'Initializing',
		status: 'Loading',
		data: 'Waiting for data …'
	};

	let draftRef, activeItemRef, isSaving, saveTimeout;

	const actions = {
		missingConfig: () => {
			state.connectionFailure = true;
			state.connecting = false;
			state.connectionStatus = 'Realtime config is missing';
			render();
		},

		connecting: () => {
			state.connectionStatus = 'Connecting to realtime database …';
			state.connected = false;
			state.connecting = true;
			render();
		},

		connectionFailure: (err) => {
			state.connectionFailure = true;
			state.connecting = false;
			state.connectionStatus = `Error connecting to realtime database:<br/> ${err.message}`;
			render();
		},

		connected: () => {
			state.connected = true;
			state.connecting = false;
			state.connectionFailure = false;
			state.connectionStatus = 'Connected to realtime database';
			render();
		},

		noActiveDraft: () => {
			state.loading = false;
			state.status = 'No realtime edition data available. Do you have the edition open in DrEdition?';
			render();
		},

		setData: (data) => {
			state.data = data;
			state.status = '·';
			state.loading = false;
			render();
		},

		setDraft: (draft) => {
			state.draft = draft;
		},
	};

	if (!(config && firebaseToken)) {
		actions.missingConfig();
		return;
	}

	await initFirebase(config, firebaseToken);

	function render() {
		view.render(state);
	}

	async function initFirebase(config, customToken) {
		actions.connecting();

		firebase.initializeApp(config);

		try {
			await firebase.auth().signInWithCustomToken(customToken);
		} catch (err) {
			console.log(err);
			actions.connectionFailure(err);
			return;
		}

		actions.connected();

		draftRef = firebase.database().ref(`/accounts/${clientId}/editions/${editionId}/regularDrafts/${userId}`);
		draftRef.on('value', async (snapshot) => {
			actions.setDraft(snapshot.val());
			isSaving = false;
			if (saveTimeout) {
				clearTimeout(saveTimeout);
			}
			return renderPreview();
		});

		document.addEventListener('click', (event) => {
			const frontItem = event.target.closest('.dre-item');

			if (frontItem && activeItemRef) {
				// Assume id is set as data-id="<id>"
				activeItemRef.set(frontItem.dataset.id);
				event.preventDefault();
			}
		});

		activeItemRef = firebase.database().ref(`/accounts/${clientId}/editions/${editionId}/activeItem/${userId}`);
		activeItemRef.on('value', (snapshot) => {
			actions.setActiveItem(snapshot.val());
			selectActiveItem();
		});
	}

	async function renderPreview() {
		if (!(state.draft && state.draft.positions)) {
			actions.noActiveDraft();
			return;
		}

		const viewData = htmlEntities(JSON.stringify(state.draft.positions, null, 2));
		if (!viewData) {
			return;
		}

		actions.setData(viewData);
	}

	function selectActiveItem() {
		view.highlightItem(state.activeItemId);
	}
}

function htmlEntities(str) {
	return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
