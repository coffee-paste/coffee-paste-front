'use strict'

import nodeFetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import jszip from 'jszip';

// Build API based on develop branch, unless it's build for main branch, then use main branch API.
const ENV_BRANCH  = process.env.GITHUB_REF !== 'main' ? 'develop' : 'main';

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
    const apiFile = await generatedZip.file('api.ts').async('nodebuffer');
    const configurationFile = await generatedZip.file('configuration.ts').async('nodebuffer');
    const customDFile = await generatedZip.file('custom.d.ts').async('nodebuffer');
    fs.writeFileSync(path.join('scripts', 'api.ts'), apiFile);
    fs.writeFileSync(path.join('scripts', 'configuration.ts'), configurationFile);
    fs.writeFileSync(path.join('scripts', 'custom.d.ts'), customDFile);

    
    // TODO: Replace portableFetch with fetch.

    // TOTO: Set BASE_PATH to be envFacade.apiUrl

    // TODO: Add localVarRequestOptions.credentials = 'include'; to all requests in generated api.ts file.

    // TODO: Add localVarRequestOptions.credentials = 'include'; to all requests in generated api.ts file.

})();
