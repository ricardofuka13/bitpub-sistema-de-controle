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
      var p=document.querySelector('.btc-desc2'); if(p)p.textContent='Pagando em Bitcoin você ganha '+v+' de desconto no pedido.';
    }
  }
  /* galeria */
  var FIXAS=['img/bitcoin.jpg','img/satoshi.jpg','img/ethereum.jpg','img/fullnode.jpg','img/stable.jpg','img/diamonds.jpg'];
  var lb=$('lb');
  function galeria(fotos){
    var g=$('gal'); if(!g)return; g.innerHTML='';
    fotos.slice(0,12).forEach(function(f){
      var b=document.createElement('button'); b.type='button'; b.setAttribute('aria-label','Ampliar foto: '+f.alt);
      var im=document.createElement('img'); im.src=f.src; im.alt=f.alt; im.loading='lazy'; im.decoding='async'; im.width=300; im.height=300;
      b.appendChild(im); b.onclick=function(){lb.querySelector('img').src=f.src;lb.querySelector('img').alt=f.alt;lb.className='on'}; g.appendChild(b);
    });
  }
  if(lb){lb.onclick=function(e){if(e.target===lb||e.target.tagName==='BUTTON')lb.className=''}; document.addEventListener('keydown',function(e){if(e.key==='Escape')lb.className=''})}
  var padrao=FIXAS.map(function(s){return {src:s,alt:'Hambúrguer BitPub'}});
  galeria(padrao);
  function fotosMenu(d){
    var r=[]; (d.itens||[]).forEach(function(i){
      var f=i.foto||''; if(/^fotos\/[\w.-]+$/.test(f))r.push({src:'../pedido/'+f,alt:i.nome||'Hambúrguer BitPub'});
      else if(/^https:\/\/[^\s"'<>]+$/.test(f))r.push({src:f,alt:i.nome||'Hambúrguer BitPub'});
    });
    return r;
  }
  /* dados da loja */
  if(C.url&&C.key){
    rpc('cardapio_publico',{}).then(function(d){
      if(!d)return; status(d); tabela(d.horarios); btc(d);
      var f=fotosMenu(d); if(f.length>=3)galeria(f.concat(padrao));
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
