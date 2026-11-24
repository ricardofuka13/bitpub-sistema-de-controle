(function(){
  var C=window.BITPUB_CFG||{}, ORIGEM='https://bitpub.app.br';
  var DIAS=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  function $(i){return document.getElementById(i)}
  function agoraSP(){
    var o={};new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).forEach(function(x){o[x.type]=x.value});
    return {dow:{Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6}[o.weekday],min:(+o.hour%24)*60+(+o.minute)};
  }
  function minDe(h){var a=String(h).split(':');return (+a[0])*60+(+a[1])}
  function hh(h){var a=String(h).split(':');return a[1]&&a[1]!=='00'?(+a[0])+'h'+a[1]:(+a[0])+'h'}
  function rpc(nome,body){
    return fetch(C.url+'/rest/v1/rpc/'+nome,{method:'POST',headers:{apikey:C.key,Authorization:'Bearer '+C.key,'Content-Type':'application/json'},body:JSON.stringify(body||{})})
      .then(function(r){return r.text().then(function(t){var d=null;try{d=t?JSON.parse(t):null}catch(e){} if(!r.ok)throw new Error((d&&(d.erro||d.message))||('http '+r.status)); return d})});
  }
  /* status aberto/fechado */
  function estado(H,modo){
    if(modo==='aberta')return {on:true};
    if(modo==='fechada')return {on:false};
    if(!H||!Object.keys(H).length)return null;
    var n=agoraSP(),hj=H[n.dow],on=false,ate='';
    if(hj){var a=minDe(hj[0]),f=minDe(hj[1]); if(a<f){if(n.min>=a&&n.min<f){on=true;ate=hj[1]}}else if(n.min>=a){on=true;ate=hj[1]}}
    var ont=H[(n.dow+6)%7]; if(ont){var a2=minDe(ont[0]),f2=minDe(ont[1]); if(f2<a2&&n.min<f2){on=true;ate=ont[1]}}
    return {on:on,ate:ate};
  }
  function proxima(H,modo){
    if(!H||modo==='fechada')return '';
    var n=agoraSP(),nomes=['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
    for(var i=0;i<=7;i++){var d=(n.dow+i)%7,w=H[d]; if(!w)continue; if(i===0&&minDe(w[0])<=n.min)continue; return (i===0?'hoje':i===1?'amanhã':nomes[d])+' às '+hh(w[0])}
    return '';
  }
  function status(d){
    var chip=$('status'),t=$('statusTxt'); if(!chip)return;
    var e=estado(d.horarios,d.modo_loja||'auto');
    if(!e){chip.style.display='none';return}
    if(e.on){chip.className='chip on';t.textContent='Aberto agora'+(e.ate?' · até '+hh(e.ate):'')}
    else{chip.className='chip off';var p=proxima(d.horarios,d.modo_loja||'auto');t.textContent='Fechado agora'+(p?' · abrimos '+p:'')}
  }
  function tabela(H){
    var tb=$('horTab'); if(!tb||!H||!Object.keys(H).length)return;
    var hoje=agoraSP().dow,html='';
    [1,2,3,4,5,6,0].forEach(function(d){
      var w=H[d]; html+='<tr'+(d===hoje?' class="hoje"':'')+'><td>'+DIAS[d]+'</td><td>'+(w?hh(w[0])+' às '+hh(w[1]):'Fechado')+'</td></tr>';
    });
    tb.innerHTML=html; tb.hidden=false; var x=$('horTxt'); if(x)x.hidden=true;
  }
  function btc(d){
    if(d.bitcoin===true&&Number(d.bitcoin_desconto)>0){
      var v=Number(d.bitcoin_desconto)+'%';
      Array.prototype.forEach.call(document.querySelectorAll('.btc-desc'),function(e){e.textContent='de '+v+' já é aplicado'});
      Array.prototype.forEach.call(document.querySelectorAll('.btc-pct'),function(e){e.textContent=v});
      var p=document.querySelector('.btc-desc2'); if(p)p.textContent='Pagando em Bitcoin você ganha '+v+' de desconto no pedido.';
    }
  }
  /* lanches: atualiza com o cardápio real */
  function burgers(d){
    var m={}; (d.itens||[]).forEach(function(i){ if(/hamb/i.test(i.cat||''))m[(i.nome||'').toLowerCase()]=i });
    Array.prototype.forEach.call(document.querySelectorAll('.bg'),function(a){
      var i=m[(a.getAttribute('data-nome')||'').toLowerCase()]; if(!i)return;
      var t=String(i.desc||'').replace(/\s+/g,' ').trim(), k=t.search(/\bPão\b/);
      if(t){ a.querySelector('.bg-t').textContent=k>0?t.slice(0,k).trim():''; a.querySelector('.bg-d').textContent=k>=0?t.slice(k):t; }
      if(Number(i.preco)>0)a.querySelector('.bg-p').textContent='R$ '+Number(i.preco).toFixed(2).replace('.',',');
    });
  }
  /* promoções (foto ou vídeo + texto) */
  function promos(d){
    var L=(d.promocoes||[]).filter(function(p){return p&&p.titulo}),sec=$('promocoes'),g=$('promoGrid');
    if(!sec||!g||!L.length)return;
    var ok=function(u){return /^https:\/\/[^\s"'<>]+$/.test(u||'')};
    var R=function(v){return 'R$ '+Number(v).toFixed(2).replace('.',',')};
    g.innerHTML='';
    L.forEach(function(p){
      var c=document.createElement('article');c.style.cssText='background:#1b1410;border:1px solid #3a2c22;border-radius:14px;overflow:hidden;display:flex;flex-direction:column';
      var m='';
      if(ok(p.video))m='<video src="'+p.video+'"'+(ok(p.foto)?' poster="'+p.foto+'"':'')+' muted loop playsinline autoplay preload="metadata" style="width:100%;aspect-ratio:4/3;object-fit:cover;background:#000"></video>';
      else if(ok(p.foto))m='<img src="'+p.foto+'" alt="" loading="lazy" decoding="async" style="width:100%;aspect-ratio:4/3;object-fit:cover">';
      var b=document.createElement('div');b.style.cssText='padding:16px;display:flex;flex-direction:column;gap:8px;flex:1';
      var h=document.createElement('h3');h.style.cssText='margin:0;font-size:22px;line-height:1.2';h.textContent=p.titulo;b.appendChild(h);
      if(p.preco_por!=null){var pr=document.createElement('p');pr.style.cssText='margin:0;font-size:18px';pr.innerHTML=(p.preco_de!=null?'<s style="opacity:.6">'+R(p.preco_de)+'</s> ':'')+'<b>'+R(p.preco_por)+'</b>';b.appendChild(pr)}
      if(p.descricao){var t=document.createElement('p');t.style.cssText='margin:0;color:#E6D6C4;white-space:pre-line';t.textContent=p.descricao;b.appendChild(t)}
      var a=document.createElement('a');a.href='https://bitpub.app.br/pedido/';a.textContent='Pedir agora';a.className='btn p';a.style.cssText='margin-top:auto;align-self:flex-start';b.appendChild(a);
      c.innerHTML=m;c.appendChild(b);g.appendChild(c);
    });
    sec.hidden=false;
  }
  /* dados da loja */
  if(C.url&&C.key){
    rpc('cardapio_publico',{}).then(function(d){
      if(!d)return; status(d); tabela(d.horarios); btc(d); burgers(d); promos(d);
      Array.prototype.forEach.call(document.querySelectorAll('.js-cripto'),function(e){e.hidden=d.cripto!==true});
      setInterval(function(){status(d)},60000);
    }).catch(function(){var c=$('status'); if(c)c.style.display='none'});
  }else{var c=$('status'); if(c)c.style.display='none'}
  /* formulário de novidades */
  var fm=$('frmNov');
  if(fm){
    $('nvZap').addEventListener('input',function(){
      var v=this.value.replace(/\D/g,'').slice(0,11),o=v;
      if(v.length>2)o='('+v.slice(0,2)+') '+v.slice(2,v.length>10?7:6)+(v.length>(v.length>10?7:6)?'-'+v.slice(v.length>10?7:6):'');
      this.value=o;
    });
    fm.addEventListener('submit',function(e){
      e.preventDefault(); var m=$('nvMsg'),b=$('nvBtn');
      function msg(t,ok){m.textContent=t;m.style.color=ok?'#3DDC84':'#FF8A80'}
      var nome=$('nvNome').value.trim(),zap=$('nvZap').value.replace(/\D/g,'');
      if(nome.length<2)return msg('Informe seu nome.');
      if(!/^[0-9]{10,13}$/.test(zap)||zap.length<10)return msg('Informe o WhatsApp com DDD.');
      if(!$('nvOk').checked)return msg('Marque que aceita receber as novidades.');
      b.disabled=true; msg('Enviando…',true);
      rpc('inscrever_novidades',{p_nome:nome,p_whatsapp:zap,p_aceitou:true}).then(function(r){
        if(r&&r.ok){fm.reset();msg('Pronto! Você vai receber nossas novidades. 🍔',true)}
        else msg((r&&r.erro)||'Não foi possível cadastrar.');
      }).catch(function(){msg('Sem conexão. Tente de novo ou chame no WhatsApp.')}).then(function(){b.disabled=false});
    });
  }
})();
