'use strict'

import nodeFetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import jszip from 'jszip';

const NODE_BUFFER = 'nodebuffer';
const CUSTOM_D_TS = 'custom.d.ts';
const CONFIGURATION_TS = 'configuration.ts';
const API_TS = 'api.ts';
const INDEX_TS = 'index.ts';
const OUTPUT_PATH = 'src/infrastructure/api';

// Build API based on develop branch, unless it's build for main branch, then use main branch API.
const ENV_BRANCH  = process.env.GITHUB_REF !== 'main' ? 'develop' : 'main';

function mkdirRecursive(dirPath) {
	if (fs.existsSync(dirPath)) { 
		return true 
	}
	const dirname = path.dirname(dirPath)
	mkdirRecursive(dirname);
	fs.mkdirSync(dirPath);
}

async function depositFile(jsZip, fileName) {
	const fileBuffer = await jsZip.file(fileName).async(NODE_BUFFER);
	fs.writeFileSync(path.join(OUTPUT_PATH, fileName), fileBuffer);
}

async function createApiTs(jsZip) {
	let fileContents = (await jsZip.file(API_TS).async(NODE_BUFFER)).toString();

	fileContents = fileContents.replace(
		/import.+portable\-fetch\.*?\"\.*?\;/,
		'const portableFetch = fetch;'
	);
	
	fileContents = fileContents.replace(
		/const\s+BASE_PATH\s+=\s+.+?\;/,
		"import { envFacade } from '../env-facade';\nconst BASE_PATH = envFacade.apiUrl;"
	);

	fs.writeFileSync(path.join(OUTPUT_PATH, API_TS), fileContents);
}

(async () => {

    // 1: fetch last swagger spec

    const body = {
        "lang": "typescript-fetch",
        "specURL": `https://raw.githubusercontent.com/coffee-paste/coffee-paste-backend/${ENV_BRANCH}/src/swagger.json`,
        "type": "CLIENT",
        "codegenVersion": "V3",
        "options": {
        }
    }

    const generateClient = {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/octet-stream' },
    };

    const genResponse = await nodeFetch('https://generator3.swagger.io/api/generate', generateClient);
    const buffer = await genResponse.buffer();

    // 2: Extract generated API
    const generatedZip = await jszip.loadAsync(buffer);

	mkdirRecursive(OUTPUT_PATH);
	await createApiTs(generatedZip);
	await depositFile(generatedZip, CONFIGURATION_TS);
	await depositFile(generatedZip, CUSTOM_D_TS);
	await depositFile(generatedZip, INDEX_TS);
    
    // TODO: Replace portableFetch with fetch.

    // TOTO: Set BASE_PATH to be envFacade.apiUrl

    // TODO: Add localVarRequestOptions.credentials = 'include'; to all requests in generated api.ts file.

    // TODO: Add localVarRequestOptions.credentials = 'include'; to all requests in generated api.ts file.

})();
