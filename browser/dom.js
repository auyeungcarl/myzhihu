// Called in a single, explicitly selected Zhihu tab. No cookies or tokens read.
function zhihuAction(args) {
  const $ = (s, root = document) => root.querySelector(s);
  const all = (s, root = document) => Array.from(root.querySelectorAll(s));
  const visible = e => !!e && e.getClientRects().length > 0;
  const norm = s => (s || '').replace(/[\u200b-\u200d\ufeff]/g, '').trim();
  const base = () => ({url: location.href, title: document.title, ready: document.readyState});
  const fail = msg => { throw Error(msg); };
  if (location.origin !== 'https://www.zhihu.com') fail('页面已离开知乎，停止');
  if (/安全验证|访问受限|请求过于频繁|访问异常/.test(document.title) ||
      all('iframe').some(e => visible(e) && /captcha/.test(e.src))) fail('需要人工完成验证或解除访问限制');
  const answer = e => {
    const meta = key => $(`meta[itemprop="${key}"]`, e)?.content || null;
    const text = $('.RichContent-inner .RichText', e) || $('.RichContent-inner', e);
    const author = all('a.UserLink-link', e).find(a => a.textContent.trim());
    return {name: meta('name') || norm(author?.textContent), author_url: author?.href || null,
      url: $('.ContentItem-time a', e)?.href || null,
      created: meta('dateCreated'), modified: meta('dateModified'),
      text: text?.innerText || '',
      incomplete: !text || all('button', e).some(b => visible(b) && /阅读全文|展开阅读全文/.test(b.innerText))};
  };
  const chat = () => {
    const root = $('.Chat-ChatBox');
    const box = root && $('.MessagesBox', root);
    const textarea = root && $('textarea', root);
    const send = root && $('button.InputBox-sendBtn', root);
    return {...base(), recipient: norm(root && $('header', root)?.innerText),
      loaded: !!(root && box && textarea && send) && !all('[aria-busy="true"], [role="progressbar"], .LoadingBar, .Spinner', root).some(visible),
      messages: box ? all('.Message', box).map(e => ({
        text: norm($('.TextMessage', e)?.textContent),
        sender: $('a[href*="/people/"]', e)?.href || null,
        failed: /发送失败|重新发送|重试/.test(e.innerText)
      })) : [],
      draft: textarea?.value ?? null, can_send: !!send && !send.disabled,
      blocked: root ? /不能向|无法发送|暂时无法|对方.*设置|已被限制|发送失败/.test(root.innerText) : false};
  };
  const assertChat = () => {
    const s = chat();
    if (location.href !== args.chat_url || s.recipient !== args.name || !s.loaded || s.blocked)
      fail('会话身份、加载状态或发送权限不符合预期');
    return s;
  };
  switch (args.action) {
    case 'account':
      return {...base(), own: all('button,a').some(e => visible(e) && norm(e.innerText) === '编辑个人资料'),
        name: norm($('.ProfileHeader-name')?.innerText)};
    case 'search':
      return {...base(), items: all('a[href*="/question/"]').filter(a => /深圳/.test(a.innerText) && /择偶|征友|找对象|交友|相亲/.test(a.innerText))
        .map(a => ({text: a.innerText, url: a.href}))};
    case 'answers':
      return {...base(), sorted: all('button[role="combobox"]').some(e => /按时间排序/.test(e.innerText)),
        answers: all('.AnswerItem').map(answer),
        end: /没有更多|已显示全部|没有回答/.test(document.body.innerText)};
    case 'expand':
      all('.AnswerItem button').filter(e => visible(e) && /^(阅读全文|展开阅读全文)/.test(norm(e.innerText))).forEach(e => e.click());
      return {ok: true};
    case 'scroll':
      window.scrollTo(0, document.documentElement.scrollHeight);
      return {ok: true};
    case 'contacts':
      return {...base(), loaded: !!$('.ChatUserList-List') && !!$('input[placeholder="搜索联系人"]'),
        names: all('.ChatUserListItem .userName-nameArea').map(e => norm(e.textContent))};
    case 'profile':
      return {...base(), name: norm($('.ProfileHeader-name')?.innerText),
        text: $('.ProfileHeader')?.innerText || '', has_message: all('button').some(b => /发私信/.test(b.innerText))};
    case 'open_chat': {
      if (location.href.replace(/\/$/, '') !== args.author_url || norm($('.ProfileHeader-name')?.innerText) !== args.name)
        fail('作者主页身份不符');
      const btn = all('button').find(b => visible(b) && /发私信/.test(b.innerText));
      if (!btn) fail('没有可见的发私信入口');
      // Keep the normal UI's destination in this managed tab; no blocked popup.
      let destination = null;
      const original = window.open;
      window.open = url => { destination = new URL(url, location.href).href; return null; };
      try { btn.click(); } finally { window.open = original; }
      if (destination && !/^https:\/\/www\.zhihu\.com\/messages\/[a-zA-Z0-9_-]+$/.test(destination))
        fail('私信目标URL不符合预期');
      return {destination, url: location.href};
    }
    case 'chat': return chat();
    case 'fill': {
      const s = assertChat();
      if (s.messages.length || s.draft) fail('已有消息或草稿，跳过');
      const input = $('.Chat-ChatBox textarea');
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input, args.message);
      input.dispatchEvent(new Event('input', {bubbles: true}));
      input.dispatchEvent(new Event('change', {bubbles: true}));
      return {filled: input.value === args.message};
    }
    case 'submit': {
      const s = assertChat();
      if (s.messages.length || s.draft !== args.message || !s.can_send) fail('发送前状态改变，停止');
      $('.Chat-ChatBox button.InputBox-sendBtn').click();
      return {clicked: true};
    }
    default: fail('未知浏览器操作');
  }
}
