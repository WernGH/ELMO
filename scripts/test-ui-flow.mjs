const fetch = globalThis.fetch;

async function testUIFlow() {
  const orgId = '11111111-1111-1111-1111-111111111111';
  const userId = '00000000-0000-0000-0000-000000000001';

  const createRes = await fetch('http://localhost:3000/api/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      organizationId: orgId,
      userId: userId,
      title: 'Executive Strategic Session'
    })
  });
  const createData = await createRes.json();
  const convId = createData.data?.id;
  console.log('1. Created conversation:', convId);

  console.log('2. Sending message to ELMO...');
  const chatRes = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Hello ELMO! What is your current readiness status?',
      conversationId: convId,
      organizationId: orgId,
      userId: userId
    })
  });

  const streamText = await chatRes.text();
  const events = streamText.split('\n\n');
  let fullAnswer = '';
  let errors = [];

  for (const ev of events) {
    if (ev.includes('event: token')) {
      const dataLine = ev.split('\n').find(l => l.startsWith('data: '));
      if (dataLine) {
        try {
          const parsed = JSON.parse(dataLine.replace('data: ', ''));
          fullAnswer += parsed.text;
        } catch {}
      }
    } else if (ev.includes('event: error')) {
      errors.push(ev);
    }
  }

  console.log('3. Any errors found?', errors.length > 0 ? errors : 'None! ZERO errors!');
  console.log('4. Full ELMO Response:\n', fullAnswer);
}

testUIFlow().catch(console.error);
