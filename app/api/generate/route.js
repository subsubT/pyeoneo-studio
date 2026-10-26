export async function GET(){return Response.json({enabled:false},{headers:{'Cache-Control':'no-store'}});}
export async function POST(){return Response.json({error:'AI 연결 대기 중입니다. 현재 입력 내용은 외부 AI로 전송되지 않습니다.'},{status:503,headers:{'Cache-Control':'no-store'}});}
