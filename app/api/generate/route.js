import {localAiEnabled, createLocalAiHandler} from '../../../lib/server/local-ai.mjs';
import {publicAiEnabled,createPublicAiHandler} from '../../../lib/server/public-ai.mjs';
export const runtime='nodejs';
export const maxDuration=300;
const handle=createLocalAiHandler();
const publicHandle=createPublicAiHandler();
export async function GET(){const local=localAiEnabled(),publicEnabled=publicAiEnabled();return Response.json({enabled:local||publicEnabled,mode:local?'local':publicEnabled?'public':'disabled',localOnly:local},{headers:{'Cache-Control':'no-store'}});}
export async function POST(req){return localAiEnabled()?handle(req):publicHandle(req);}
