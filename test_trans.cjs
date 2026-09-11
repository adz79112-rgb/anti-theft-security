const { translate } = require('@vitalets/google-translate-api');

async function test() {
  const res = await translate('Hello world ||| How are you', { to: 'zh-CN' });
  console.log(res.text);
}
test();
