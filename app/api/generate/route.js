import {localAiEnabled, createLocalAiHandler} from '../../../lib/server/local-ai.mjs';
export const runtime='nodejs';
const handle=createLocalAiHandler();
export async function GET(){return Response.json({enabled:localAiEnabled(),localOnly:true},{headers:{'Cache-Control':'no-store'}});}
export async function POST(req){return handle(req);}
