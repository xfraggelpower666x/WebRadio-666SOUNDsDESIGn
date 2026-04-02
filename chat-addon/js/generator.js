
function toBold(text){
  const map={"A":"𝐀","B":"𝐁","C":"𝐂","D":"𝐃","E":"𝐄","F":"𝐅","G":"𝐆","H":"𝐇","I":"𝐈","J":"𝐉","K":"𝐊","L":"𝐋","M":"𝐌","N":"𝐍","O":"𝐎","P":"𝐏","Q":"𝐐","R":"𝐑","S":"𝐒","T":"𝐓","U":"𝐔","V":"𝐕","W":"𝐖","X":"𝐗","Y":"𝐘","Z":"𝐙","a":"𝐚","b":"𝐛","c":"𝐜","d":"𝐝","e":"𝐞","f":"𝐟","g":"𝐠","h":"𝐡","i":"𝐢","j":"𝐣","k":"𝐤","l":"𝐥","m":"𝐦","n":"𝐧","o":"𝐨","p":"𝐩","q":"𝐪","r":"𝐫","s":"𝐬","t":"𝐭","u":"𝐮","v":"𝐯","w":"𝐰","x":"𝐱","y":"𝐲","z":"𝐳","0":"𝟎","1":"𝟏","2":"𝟐","3":"𝟑","4":"𝟒","5":"𝟓","6":"𝟔","7":"𝟕","8":"𝟖","9":"𝟗"};
  return [...text].map(ch => map[ch] || ch).join("");
}
function toFullwidth(text){
  return [...text].map(ch => { const code=ch.charCodeAt(0); if(ch===" ") return " "; if(code>=33 && code<=126) return String.fromCharCode(code+65248); return ch; }).join("");
}
function toSmallCaps(text){
  const map={"a":"ᴀ","b":"ʙ","c":"ᴄ","d":"ᴅ","e":"ᴇ","f":"ꜰ","g":"ɢ","h":"ʜ","i":"ɪ","j":"ᴊ","k":"ᴋ","l":"ʟ","m":"ᴍ","n":"ɴ","o":"ᴏ","p":"ᴘ","q":"ǫ","r":"ʀ","s":"s","t":"ᴛ","u":"ᴜ","v":"ᴠ","w":"ᴡ","x":"x","y":"ʏ","z":"ᴢ"};
  return [...text].map(ch => map[ch.toLowerCase()] || ch).join("");
}
function toGothic(text){
  const map={"A":"𝕬","B":"𝕭","C":"𝕮","D":"𝕯","E":"𝕰","F":"𝕱","G":"𝕲","H":"𝕳","I":"𝕴","J":"𝕵","K":"𝕶","L":"𝕷","M":"𝕸","N":"𝕹","O":"𝕺","P":"𝕻","Q":"𝕼","R":"𝕽","S":"𝕾","T":"𝕿","U":"𝖀","V":"𝖁","W":"𝖂","X":"𝖃","Y":"𝖄","Z":"𝖅","a":"𝖆","b":"𝖇","c":"𝖈","d":"𝖉","e":"𝖊","f":"𝖋","g":"𝖌","h":"𝖍","i":"𝖎","j":"𝖏","k":"𝖐","l":"𝖑","m":"𝖒","n":"𝖓","o":"𝖔","p":"𝖕","q":"𝖖","r":"𝖗","s":"𝖘","t":"𝖙","u":"𝖚","v":"𝖛","w":"𝖜","x":"𝖝","y":"𝖞","z":"𝖟"};
  return [...text].map(ch => map[ch] || ch).join("");
}
function banner(text, styleFn, left, right){ return left + " " + styleFn(text) + " " + right; }
function copyText(id){
  const el=document.getElementById(id);
  const txt=el.innerText || el.textContent || "";
  navigator.clipboard.writeText(txt);
}
function fillGenerator(inputId, outputs){
  const text=document.getElementById(inputId).value;
  if(outputs.bold) document.getElementById(outputs.bold).innerText=toBold(text);
  if(outputs.full) document.getElementById(outputs.full).innerText=toFullwidth(text);
  if(outputs.small) document.getElementById(outputs.small).innerText=toSmallCaps(text);
  if(outputs.gothic) document.getElementById(outputs.gothic).innerText=toGothic(text);
  if(outputs.banner1) document.getElementById(outputs.banner1).innerText=banner(text,toBold,"☠","☠");
  if(outputs.banner2) document.getElementById(outputs.banner2).innerText=banner(text,toFullwidth,"⚡","⚡");
}
