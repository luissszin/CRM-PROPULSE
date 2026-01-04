export const verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
};

export const receiveMessage = async (req, res) => {
  try {
    console.log(JSON.stringify(req.body, null, 2));
    res.sendStatus(200);
  } catch (err) {
    console.error('Error in receiveMessage:', err);
    try { res.sendStatus(500); } catch (e) { console.error('Failed to send error response', e); }
  }
};