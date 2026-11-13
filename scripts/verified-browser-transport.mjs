// Optional cloud-test transport: Node's HTTPS client validates the environment CA
// already supplied through NODE_EXTRA_CA_CERTS. No persistent browser trust edits,
// TLS bypass, synthetic response, retry, model substitution or production changes.
// Page/API mocks registered by individual tests retain precedence via fallback().
export async function verifiedBrowserTransport(context,base){
 if(process.env.VERIFIED_HTTPS_RELAY!=='1'||new URL(base).protocol!=='https:')return;
 await context.route(`${new URL(base).origin}/**`,async route=>{
  const response=await context.request.fetch(route.request(),{timeout:300000,maxRetries:0});
  try{await route.fulfill({response});}finally{await response.dispose();}
 });
}
