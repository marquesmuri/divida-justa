import { useState, useEffect, useRef } from "react";

/* ─────────────────────────────────────────────
   HOOK: detecta tela mobile
───────────────────────────────────────────── */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return isMobile;
}

/* ─────────────────────────────────────────────
   CHATBOT DATA & LOGIC
───────────────────────────────────────────── */
const STEPS = {
  WELCOME: "welcome", BANCO: "banco", TIPO: "tipo",
  VALOR_ORIGINAL: "valor_original", VALOR_ATUAL: "valor_atual",
  TEMPO: "tempo", NEGATIVADO: "negativado", TENTOU_NEGOCIAR: "tentou_negociar",
  NOME: "nome", TELEFONE: "telefone", ANALISANDO: "analisando", RESULTADO: "resultado",
};
const BANCOS = ["Banco do Brasil","Caixa Econômica","Bradesco","Itaú","Santander","Nubank","Inter","PAN","BMG","Portocred","Agibank","C6 Bank","Mercado Pago","Crefisa","Outro"];
const TIPOS = [
  { label: "💳 Cartão de Crédito", value: "cartao", risco: "muito_alto" },
  { label: "💵 Empréstimo Pessoal", value: "emprestimo", risco: "alto" },
  { label: "🏦 Cheque Especial", value: "cheque_especial", risco: "muito_alto" },
  { label: "🏠 Financiamento", value: "financiamento", risco: "medio" },
  { label: "🔄 Refinanciamento", value: "refinanciamento", risco: "alto" },
  { label: "📦 Outro", value: "outro", risco: "medio" },
];
const TEMPOS = [
  { label: "Menos de 6 meses", value: "6m", multiplicador: 0.5 },
  { label: "6 meses a 1 ano", value: "1a", multiplicador: 1 },
  { label: "1 a 2 anos", value: "2a", multiplicador: 1.5 },
  { label: "2 a 5 anos", value: "5a", multiplicador: 2 },
  { label: "Mais de 5 anos", value: "5mais", multiplicador: 2.5 },
];
function calcularRisco(data) {
  const orig = parseFloat(data.valorOriginal?.replace(/\D/g,"")) || 0;
  const atual = parseFloat(data.valorAtual?.replace(/\D/g,"")) || 0;
  const crescimento = orig > 0 ? ((atual - orig) / orig) * 100 : 0;
  const tipoData = TIPOS.find(t => t.value === data.tipo);
  const tempoData = TEMPOS.find(t => t.value === data.tempo);
  let pontos = 0;
  if (crescimento > 200) pontos += 40; else if (crescimento > 100) pontos += 25; else if (crescimento > 50) pontos += 15;
  if (tipoData?.risco === "muito_alto") pontos += 25; else if (tipoData?.risco === "alto") pontos += 15; else pontos += 5;
  if (tempoData?.multiplicador >= 2) pontos += 15; else if (tempoData?.multiplicador >= 1.5) pontos += 10;
  if (data.negativado === "sim") pontos += 20;
  if (["Portocred","Crefisa","BMG","Agibank"].includes(data.banco)) pontos += 15;
  return { pontos, crescimento: Math.round(crescimento), nivel: pontos >= 70 ? "alto" : pontos >= 40 ? "medio" : "baixo" };
}

/* ─────────────────────────────────────────────
   CHATBOT COMPONENT
───────────────────────────────────────────── */
function Chatbot() {
  const [step, setStep] = useState(STEPS.WELCOME);
  const [data, setData] = useState({});
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [options, setOptions] = useState([]);
  const messagesRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing, options]);

  useEffect(() => {
    addBotMessages([
      "Olá! Eu sou a **Juri**, assistente jurídica do escritório **Marques & Cunha Advogados**. 👋",
      "Estou aqui para te ajudar a descobrir se a sua dívida tem **juros abusivos** — e se você tem direito à revisão judicial.",
      "São apenas algumas perguntas rápidas. É totalmente **gratuito e sigiloso**. 🔒",
      "Pronto para começar?",
    ], [{ label: "Sim, quero saber! →", value: "sim" }]);
  }, []);

  function addBotMessages(msgs, opts = [], onDone = null) {
    setTyping(true); setOptions([]);
    let delay = 0;
    msgs.forEach((msg, i) => {
      delay += i === 0 ? 700 : 800 + msg.length * 8;
      setTimeout(() => {
        setMessages(prev => [...prev, { from: "bot", text: msg }]);
        if (i === msgs.length - 1) {
          setTimeout(() => {
            setTyping(false);
            if (opts.length) setOptions(opts);
            if (!opts.length && onDone) onDone();
          }, 300);
        }
      }, delay);
    });
  }

  function addUserMessage(text) {
    setMessages(prev => [...prev, { from: "user", text }]);
    setOptions([]); setInput("");
  }

  function goTo(nextStep, newData = {}) {
    const merged = { ...data, ...newData };
    setData(merged); setStep(nextStep);
    const name0 = merged.nome?.split(" ")[0];
    const flows = {
      [STEPS.BANCO]: () => setTimeout(() => addBotMessages(["Em qual **banco ou instituição financeira** você tem essa dívida?"], BANCOS.map(b => ({ label: b, value: b }))), 400),
      [STEPS.TIPO]: () => addBotMessages([`Entendido! E qual é o **tipo de dívida** com o ${merged.banco}?`], TIPOS.map(t => ({ label: t.label, value: t.value }))),
      [STEPS.VALOR_ORIGINAL]: () => addBotMessages(["Qual era o **valor original** da dívida? (quanto você pegou ou usou no cartão)", "Digite aproximadamente — não precisa ser exato. 😊"], [], () => inputRef.current?.focus()),
      [STEPS.VALOR_ATUAL]: () => addBotMessages(["E qual é o **valor cobrado hoje** pelo banco?"], [], () => inputRef.current?.focus()),
      [STEPS.TEMPO]: () => addBotMessages(["Há **quanto tempo** essa dívida existe?"], TEMPOS.map(t => ({ label: t.label, value: t.value }))),
      [STEPS.NEGATIVADO]: () => addBotMessages(["Seu nome está **negativado** (SPC, Serasa ou Boa Vista) por causa dessa dívida?"], [
        { label: "✅ Sim, estou negativado(a)", value: "sim" },
        { label: "❌ Não estou negativado(a)", value: "nao" },
        { label: "🤷 Não sei", value: "nao_sei" },
      ]),
      [STEPS.TENTOU_NEGOCIAR]: () => addBotMessages(["Você já tentou **renegociar** essa dívida com o banco?"], [
        { label: "Sim, mas não chegamos a um acordo", value: "sim_sem_acordo" },
        { label: "Sim, fiz acordo mas não consegui pagar", value: "sim_com_acordo" },
        { label: "Não tentei ainda", value: "nao" },
      ]),
      [STEPS.NOME]: () => addBotMessages([
        "Ótimo! Já tenho informações suficientes para gerar sua análise. 📊",
        "Antes de exibir o resultado, preciso de alguns dados para que nossa equipe possa **entrar em contato com você**.",
        "Qual é o seu **nome completo**?",
      ], [], () => inputRef.current?.focus()),
      [STEPS.TELEFONE]: () => addBotMessages([`Prazer, ${name0}! Agora me informe seu **WhatsApp** com DDD:`], [], () => inputRef.current?.focus()),
      [STEPS.ANALISANDO]: () => {
        setOptions([]);
        setTimeout(() => {
          addBotMessages(["Analisando os dados da sua dívida... ⚖️"], [], null);
          setTimeout(() => { setTyping(true); setTimeout(() => { setTyping(false); setStep(STEPS.RESULTADO); }, 3500); }, 1800);
        }, 300);
      },
    };
    flows[nextStep]?.();
  }

  function handleOption(opt) {
    addUserMessage(opt.label); setOptions([]);
    const map = {
      [STEPS.WELCOME]: () => goTo(STEPS.BANCO),
      [STEPS.BANCO]: () => goTo(STEPS.TIPO, { banco: opt.value }),
      [STEPS.TIPO]: () => goTo(STEPS.VALOR_ORIGINAL, { tipo: opt.value }),
      [STEPS.TEMPO]: () => goTo(STEPS.NEGATIVADO, { tempo: opt.value }),
      [STEPS.NEGATIVADO]: () => goTo(STEPS.TENTOU_NEGOCIAR, { negativado: opt.value }),
      [STEPS.TENTOU_NEGOCIAR]: () => goTo(STEPS.NOME, { negociou: opt.value }),
    };
    map[step]?.();
  }

  function handleTextInput() {
    if (!input.trim()) return;
    const val = input.trim();
    if (step === STEPS.VALOR_ORIGINAL) { addUserMessage(val); goTo(STEPS.VALOR_ATUAL, { valorOriginal: val.replace(/\D/g,"").padEnd(3,"0") }); }
    else if (step === STEPS.VALOR_ATUAL) { addUserMessage(val); goTo(STEPS.TEMPO, { valorAtual: val.replace(/\D/g,"").padEnd(3,"0") }); }
    else if (step === STEPS.NOME) { addUserMessage(val); goTo(STEPS.TELEFONE, { nome: val }); }
    else if (step === STEPS.TELEFONE) { addUserMessage(val); goTo(STEPS.ANALISANDO, { telefone: val }); }
  }

  const risco = step === STEPS.RESULTADO ? calcularRisco(data) : null;
  const nivelCfg = {
    alto: { cor: "#ef4444", corBg: "rgba(239,68,68,0.1)", titulo: "⚠️ Alta Probabilidade de Juros Abusivos", sub: "Identificamos fortes indícios de irregularidades na sua dívida.", badge: "CASO PRIORITÁRIO", badgeBg: "#ef4444" },
    medio: { cor: "#f59e0b", corBg: "rgba(245,158,11,0.1)", titulo: "📋 Indícios de Irregularidades", sub: "Sua dívida apresenta características que merecem análise jurídica detalhada.", badge: "ANÁLISE RECOMENDADA", badgeBg: "#f59e0b" },
    baixo: { cor: "#10b981", corBg: "rgba(16,185,129,0.1)", titulo: "🔍 Análise Recomendada", sub: "Mesmo com índices menores, uma revisão pode revelar cobranças indevidas.", badge: "CONSULTA GRATUITA", badgeBg: "#10b981" },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 520 }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#c9a84c,#e8c97a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#0c1520", fontWeight: "bold", flexShrink: 0 }}>⚖</div>
        <div>
          <div style={{ color: "#e8c97a", fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 14 }}>Juri</div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", animation: "djPulse 2s infinite" }} />
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontFamily: "system-ui" }}>Assistente jurídica · online agora</span>
          </div>
        </div>
      </div>

      <div ref={messagesRef} style={{ flex: 1, overflowY: "auto", padding: "18px 16px", display: "flex", flexDirection: "column", gap: 10, maxHeight: 480 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.from === "user" ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 7 }}>
            {msg.from === "bot" && (
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#c9a84c,#e8c97a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0, marginBottom: 2 }}>⚖</div>
            )}
            <div style={{ maxWidth: "78%", padding: "10px 14px", borderRadius: msg.from === "user" ? "16px 16px 3px 16px" : "16px 16px 16px 3px", background: msg.from === "user" ? "linear-gradient(135deg,#c9a84c,#b8902d)" : "rgba(255,255,255,0.07)", color: msg.from === "user" ? "#0c1520" : "rgba(255,255,255,0.87)", fontSize: 13, lineHeight: 1.65, fontFamily: "system-ui", border: msg.from === "bot" ? "1px solid rgba(255,255,255,0.07)" : "none" }}
              dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>") }} />
          </div>
        ))}

        {typing && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 7 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#c9a84c,#e8c97a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>⚖</div>
            <div style={{ padding: "10px 16px", borderRadius: "16px 16px 16px 3px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 4, alignItems: "center" }}>
              {[0,1,2].map(n => <div key={n} style={{ width: 6, height: 6, borderRadius: "50%", background: "#c9a84c", animation: `djBounce 1.2s ease-in-out ${n*0.2}s infinite` }} />)}
            </div>
          </div>
        )}

        {step === STEPS.RESULTADO && risco && (() => {
          const cfg = nivelCfg[risco.nivel];
          const orig = parseInt(data.valorOriginal) / 100;
          const atual = parseInt(data.valorAtual) / 100;
          return (
            <div style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${cfg.cor}40`, borderRadius: 16, padding: 18, marginTop: 6, fontFamily: "system-ui" }}>
              <div style={{ display: "inline-flex", alignItems: "center", background: cfg.badgeBg, color: "#fff", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", padding: "3px 10px", borderRadius: 20, marginBottom: 12 }}>{cfg.badge}</div>
              <h3 style={{ color: cfg.cor, margin: "0 0 6px", fontSize: 15, fontFamily: "Georgia, serif", lineHeight: 1.3 }}>{cfg.titulo}</h3>
              <p style={{ color: "rgba(255,255,255,0.55)", margin: "0 0 14px", fontSize: 12, lineHeight: 1.6 }}>{cfg.sub}</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                {[
                  { label: "Dívida original", valor: orig ? `R$ ${orig.toLocaleString("pt-BR",{minimumFractionDigits:2})}` : "—" },
                  { label: "Valor atual", valor: atual ? `R$ ${atual.toLocaleString("pt-BR",{minimumFractionDigits:2})}` : "—" },
                  { label: "Crescimento", valor: `+${risco.crescimento}%`, destaque: risco.crescimento > 100 },
                  { label: "Negativação", valor: data.negativado === "sim" ? "Sim ⚠️" : "Não" },
                ].map((item, i) => (
                  <div key={i} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "10px 12px", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 9, letterSpacing: "0.05em", marginBottom: 3 }}>{item.label.toUpperCase()}</div>
                    <div style={{ color: item.destaque ? cfg.cor : "rgba(255,255,255,0.87)", fontSize: 14, fontWeight: 600 }}>{item.valor}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: cfg.corBg, border: `1px solid ${cfg.cor}25`, borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
                <div style={{ color: cfg.cor, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 7 }}>O QUE PODE SER FEITO</div>
                {[
                  risco.nivel !== "baixo" && "✅ Revisão judicial dos juros e encargos",
                  data.negativado === "sim" && "✅ Indenização por dano moral pela negativação",
                  risco.crescimento > 100 && "✅ Restituição em dobro de cobranças abusivas",
                  "✅ Redução do saldo devedor ao valor justo",
                  risco.nivel === "alto" && "✅ Tutela de urgência para suspender cobranças",
                ].filter(Boolean).map((item, i) => (
                  <div key={i} style={{ color: "rgba(255,255,255,0.72)", fontSize: 12, lineHeight: 1.9 }}>{item}</div>
                ))}
              </div>
              <div style={{ background: "linear-gradient(135deg,rgba(201,168,76,0.12),rgba(201,168,76,0.04))", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
                <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, margin: "0 0 10px", lineHeight: 1.6 }}>
                  Nossa equipe analisará seu caso e entrará em contato em até <strong style={{ color: "#e8c97a" }}>24 horas úteis</strong>.
                </p>
                <a href={`https://wa.me/55${data.telefone?.replace(/\D/g,"")}?text=Ol%C3%A1%20${encodeURIComponent(data.nome?.split(" ")[0]||"")}%2C%20aqui%20%C3%A9%20a%20equipe%20Marques%20%26%20Cunha%20Advogados.%20Acabamos%20de%20ver%20o%20resultado%20da%20sua%20an%C3%A1lise%20de%20d%C3%ADvida.%20Podemos%20conversar%3F`}
                  style={{ display: "block", background: "linear-gradient(135deg,#c9a84c,#e8c97a)", color: "#0c1520", textDecoration: "none", padding: "13px", borderRadius: 9, fontWeight: 700, fontSize: 13, letterSpacing: "0.03em" }}>
                  📲 QUERO CONSULTA GRATUITA
                </a>
                <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 9, margin: "8px 0 0" }}>🔒 Dados protegidos e tratados com sigilo profissional</p>
              </div>
              <p style={{ color: "rgba(255,255,255,0.18)", fontSize: 9, textAlign: "center", margin: "12px 0 0", lineHeight: 1.6 }}>Análise preliminar. Não constitui parecer jurídico.</p>
            </div>
          );
        })()}

        {options.length > 0 && !typing && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, justifyContent: "flex-end", paddingLeft: 36 }}>
            {options.map((opt, i) => (
              <button key={i} onClick={() => handleOption(opt)}
                style={{ padding: "9px 14px", borderRadius: 18, border: "1px solid rgba(201,168,76,0.35)", background: "rgba(201,168,76,0.07)", color: "#e8c97a", fontSize: 12, cursor: "pointer", fontFamily: "system-ui", transition: "all 0.15s" }}
                onMouseEnter={e => { e.target.style.background="rgba(201,168,76,0.18)"; e.target.style.borderColor="rgba(201,168,76,0.6)"; }}
                onMouseLeave={e => { e.target.style.background="rgba(201,168,76,0.07)"; e.target.style.borderColor="rgba(201,168,76,0.35)"; }}>
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {[STEPS.VALOR_ORIGINAL,STEPS.VALOR_ATUAL,STEPS.NOME,STEPS.TELEFONE].includes(step) && !typing && (
        <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 8, flexShrink: 0 }}>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==="Enter" && handleTextInput()}
            placeholder={step===STEPS.VALOR_ORIGINAL?"Ex: 5000":step===STEPS.VALOR_ATUAL?"Ex: 18000":step===STEPS.NOME?"Seu nome completo":"DDD + número (ex: 13999991234)"}
            style={{ flex:1, padding:"11px 16px", borderRadius:18, border:"1px solid rgba(201,168,76,0.25)", background:"rgba(255,255,255,0.05)", color:"#fff", fontSize:13, fontFamily:"system-ui", outline:"none" }} />
          <button onClick={handleTextInput} style={{ width:42, height:42, borderRadius:"50%", background:"linear-gradient(135deg,#c9a84c,#e8c97a)", border:"none", cursor:"pointer", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>→</button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   LANDING PAGE
───────────────────────────────────────────── */
export default function LandingPage() {
  const isMobile = useIsMobile();
  const [scrolled, setScrolled] = useState(false);
  const chatSectionRef = useRef(null);
  const G = "#c9a84c";
  const GL = "#e8c97a";
  const px = isMobile ? "20px" : "32px";

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const scrollToChat = () => chatSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div style={{ background: "#0c1520", minHeight: "100vh", color: "#fff", fontFamily: "system-ui, sans-serif", overflowX: "hidden" }}>

      {/* NAV */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, padding: `0 ${px}`, height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", background: scrolled ? "rgba(12,21,32,0.97)" : "transparent", backdropFilter: scrolled ? "blur(12px)" : "none", borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "none", transition: "all 0.3s" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>⚖️</span>
          <span style={{ fontFamily: "Georgia, serif", color: GL, fontWeight: "bold", fontSize: 16 }}>Dívida Justa</span>
          {!isMobile && <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, marginLeft: 4, fontStyle: "italic" }}>by Marques & Cunha</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 20 }}>
          {!isMobile && <a href="https://instagram.com/marquesecunha.adv" target="_blank" rel="noreferrer" style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, textDecoration: "none" }}>@marquesecunha.adv</a>}
          <button onClick={scrollToChat} style={{ padding: isMobile ? "8px 14px" : "8px 20px", borderRadius: 20, background: `linear-gradient(135deg,${G},${GL})`, border: "none", color: "#0c1520", fontWeight: 700, fontSize: isMobile ? 11 : 12, cursor: "pointer", whiteSpace: "nowrap" }}>
            {isMobile ? "ANALISAR →" : "ANALISAR MINHA DÍVIDA"}
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", position: "relative", overflow: "hidden", paddingTop: 60 }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div style={{ position: "absolute", top: "10%", right: "-10%", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle, ${G}12 0%, transparent 70%)`, filter: "blur(40px)" }} />
          <div style={{ position: "absolute", bottom: "5%", left: "-15%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)", filter: "blur(40px)" }} />
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.03 }} xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 60 0 L 0 0 0 60" fill="none" stroke="#fff" strokeWidth="0.5"/></pattern></defs>
            <rect width="100%" height="100%" fill="url(#grid)"/>
          </svg>
        </div>

        <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "60px 20px 40px" : "80px 32px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 40 : 60, alignItems: "center", position: "relative", width: "100%" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${G}18`, border: `1px solid ${G}35`, borderRadius: 20, padding: "6px 14px", marginBottom: 24 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", animation: "djPulse 2s infinite" }} />
              <span style={{ color: GL, fontSize: 10, fontWeight: 600, letterSpacing: "0.07em" }}>ANÁLISE GRATUITA · RESULTADO IMEDIATO</span>
            </div>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: isMobile ? 36 : 52, lineHeight: 1.15, margin: "0 0 20px", fontWeight: "normal" }}>
              Sua dívida cresceu{" "}
              <span style={{ color: GL, position: "relative", display: "inline-block" }}>
                além do limite
                <svg style={{ position: "absolute", bottom: -2, left: 0, width: "100%", height: 3 }} viewBox="0 0 200 3">
                  <path d="M0 1.5 Q100 3 200 1.5" stroke={G} strokeWidth="2" fill="none"/>
                </svg>
              </span>
              {" "}da lei?
            </h1>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: isMobile ? 15 : 17, lineHeight: 1.75, margin: "0 0 32px" }}>
              Bancos cobram juros que ultrapassam os limites legais. Nossa assistente jurídica analisa sua situação em minutos — de graça, sem compromisso.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 40 }}>
              <button onClick={scrollToChat} style={{ padding: "15px 28px", borderRadius: 10, background: `linear-gradient(135deg,${G},${GL})`, border: "none", color: "#0c1520", fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: `0 8px 32px ${G}30`, width: isMobile ? "100%" : "auto" }}>
                Descobrir agora — é grátis →
              </button>
              {!isMobile && (
                <a href="https://instagram.com/marquesecunha.adv" target="_blank" rel="noreferrer" style={{ padding: "15px 24px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.65)", fontSize: 14, textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
                  📸 Ver cases reais
                </a>
              )}
            </div>
            <div style={{ display: "flex", gap: isMobile ? 24 : 32 }}>
              {[{ num: "+300", label: "Casos analisados" }, { num: "R$ 2M+", label: "Cobranças revisadas" }, { num: "97%", label: "Taxa de procedência" }].map((s, i) => (
                <div key={i}>
                  <div style={{ fontFamily: "Georgia, serif", fontSize: isMobile ? 22 : 26, color: GL, fontWeight: "bold", lineHeight: 1 }}>{s.num}</div>
                  <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Mock chat — só desktop */}
          {!isMobile && (
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", inset: -2, borderRadius: 24, background: `linear-gradient(135deg,${G}30,transparent,${G}10)`, zIndex: 0 }} />
              <div style={{ position: "relative", zIndex: 1, background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", borderRadius: 22, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden", boxShadow: `0 32px 80px rgba(0,0,0,0.5)` }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: `linear-gradient(135deg,${G},${GL})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#0c1520" }}>⚖</div>
                  <div>
                    <div style={{ color: GL, fontFamily: "Georgia, serif", fontWeight: "bold", fontSize: 13 }}>Juri</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
                      <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 10 }}>Assistente jurídica · online</span>
                    </div>
                  </div>
                </div>
                <div style={{ padding: "18px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { from: "bot", text: "Em qual banco você tem essa dívida?" },
                    { from: "user", text: "Nubank — cartão de crédito" },
                    { from: "bot", text: "Qual era o valor original? E quanto cobram hoje?" },
                    { from: "user", text: "Comecei com R$ 4.000 — hoje cobram R$ 18.000" },
                  ].map((m, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: m.from === "user" ? "flex-end" : "flex-start" }}>
                      <div style={{ maxWidth: "80%", padding: "9px 13px", borderRadius: m.from === "user" ? "14px 14px 3px 14px" : "14px 14px 14px 3px", background: m.from === "user" ? `linear-gradient(135deg,${G},#b8902d)` : "rgba(255,255,255,0.07)", color: m.from === "user" ? "#0c1520" : "rgba(255,255,255,0.82)", fontSize: 12, lineHeight: 1.6 }}>{m.text}</div>
                    </div>
                  ))}
                  <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, padding: "12px 14px" }}>
                    <div style={{ color: "#ef4444", fontSize: 10, fontWeight: 700, marginBottom: 6 }}>⚠️ CASO PRIORITÁRIO IDENTIFICADO</div>
                    <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, lineHeight: 1.7 }}>Crescimento de <strong style={{ color: "#ef4444" }}>+350%</strong> — forte indício de juros abusivos.</div>
                  </div>
                  <button onClick={scrollToChat} style={{ width: "100%", padding: "12px", borderRadius: 9, background: `linear-gradient(135deg,${G},${GL})`, border: "none", color: "#0c1520", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>📲 QUERO CONSULTA GRATUITA</button>
                </div>
              </div>
              <div style={{ position: "absolute", top: -16, right: -16, background: "#ef4444", color: "#fff", borderRadius: 20, padding: "6px 14px", fontSize: 11, fontWeight: 700, boxShadow: "0 4px 16px rgba(239,68,68,0.4)" }}>ANÁLISE EM TEMPO REAL</div>
            </div>
          )}
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section style={{ padding: isMobile ? "60px 20px" : "80px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ color: GL, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 12 }}>COMO FUNCIONA</div>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: isMobile ? 28 : 36, fontWeight: "normal", margin: 0 }}>3 passos. Menos de 3 minutos.</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 20 }}>
            {[
              { num: "01", icon: "💬", titulo: "Responda às perguntas", desc: "A Juri faz perguntas simples sobre sua dívida: qual banco, tipo, quanto cresceu, se você está negativado." },
              { num: "02", icon: "⚖️", titulo: "Análise jurídica automática", desc: "Nosso sistema compara os dados com os limites legais de juros previstos em lei e na jurisprudência." },
              { num: "03", icon: "📲", titulo: "Nossa equipe te contata", desc: "Com o resultado, os advogados entram em contato em até 24h para explicar os próximos passos." },
            ].map((item, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, padding: 24, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 12, right: 16, fontFamily: "Georgia, serif", fontSize: 44, color: `${G}12`, fontWeight: "bold", lineHeight: 1 }}>{item.num}</div>
                <div style={{ fontSize: 30, marginBottom: 14 }}>{item.icon}</div>
                <h3 style={{ fontFamily: "Georgia, serif", fontSize: 17, fontWeight: "normal", margin: "0 0 8px", color: GL }}>{item.titulo}</h3>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, lineHeight: 1.75, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DIREITOS */}
      <section style={{ padding: isMobile ? "50px 20px" : "60px 32px", background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ color: GL, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 12 }}>VOCÊ PODE TER DIREITO A</div>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: isMobile ? 26 : 34, fontWeight: "normal", margin: 0 }}>O que a lei garante ao devedor</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)", gap: 14 }}>
            {[
              { icon: "⚖️", titulo: "Revisão judicial dos contratos", desc: "O CDC e o Código Civil permitem a revisão de cláusulas abusivas em contratos bancários." },
              { icon: "💰", titulo: "Restituição em dobro", desc: "Se valores foram cobrados indevidamente, o art. 42 do CDC garante devolução em dobro do que foi pago a mais." },
              { icon: "🚫", titulo: "Suspensão de cobranças", desc: "Via tutela de urgência, é possível suspender cobranças abusivas enquanto o processo tramita." },
              { icon: "⚡", titulo: "Indenização por dano moral", desc: "Negativações indevidas geram direito a indenização, independente da revisão da dívida." },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 14, padding: 18, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14 }}>
                <div style={{ fontSize: 26, flexShrink: 0, marginTop: 2 }}>{item.icon}</div>
                <div>
                  <h4 style={{ color: GL, fontFamily: "Georgia, serif", fontWeight: "normal", fontSize: 15, margin: "0 0 6px" }}>{item.titulo}</h4>
                  <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, lineHeight: 1.75, margin: 0 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CHAT SECTION */}
      <section ref={chatSectionRef} style={{ padding: isMobile ? "50px 20px" : "80px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1.1fr", gap: isMobile ? 32 : 60, alignItems: "start" }}>
          <div style={{ paddingTop: isMobile ? 0 : 20 }}>
            <div style={{ color: GL, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 14 }}>ANÁLISE GRATUITA</div>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: isMobile ? 30 : 38, fontWeight: "normal", margin: "0 0 16px", lineHeight: 1.2 }}>Fale agora com a Juri</h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: isMobile ? 14 : 15, lineHeight: 1.8, margin: "0 0 24px" }}>
              Nossa assistente jurídica está disponível 24 horas. Responda às perguntas e descubra em menos de 3 minutos se sua dívida tem indícios de abusividade.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {["✅ Sem necessidade de cadastro","✅ 100% gratuito — sem pegadinhas","✅ Dados sigilosos e protegidos","✅ Resultado imediato e personalizado","✅ Advogados reais analisam seu caso"].map((item, i) => (
                <div key={i} style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>{item}</div>
              ))}
            </div>
            <div style={{ marginTop: 32, padding: "18px 20px", background: `${G}10`, border: `1px solid ${G}25`, borderRadius: 14 }}>
              <div style={{ color: GL, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 8 }}>ESCRITÓRIO RESPONSÁVEL</div>
              <div style={{ color: "rgba(255,255,255,0.8)", fontFamily: "Georgia, serif", fontSize: 15, marginBottom: 4 }}>Marques & Cunha Advogados</div>
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>Direito Bancário · Direito Digital</div>
              <a href="https://instagram.com/marquesecunha.adv" target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, color: GL, fontSize: 12, textDecoration: "none" }}>📸 @marquesecunha.adv</a>
            </div>
          </div>

          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", inset: -1, borderRadius: 22, background: `linear-gradient(135deg,${G}40,transparent,${G}15)`, zIndex: 0 }} />
            <div style={{ position: "relative", zIndex: 1, background: "#111d2c", borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden", boxShadow: `0 24px 60px rgba(0,0,0,0.5)` }}>
              <Chatbot />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: isMobile ? "40px 20px 60px" : "60px 32px", maxWidth: 800, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ color: GL, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 12 }}>DÚVIDAS FREQUENTES</div>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: isMobile ? 26 : 32, fontWeight: "normal", margin: 0 }}>Perguntas comuns</h2>
        </div>
        {[
          { q: "A análise é realmente gratuita?", r: "Sim. A análise pela Juri é 100% gratuita e sem nenhum compromisso. A consulta com o advogado também é gratuita." },
          { q: "O escritório fica com parte do valor recuperado?", r: "Nossos honorários são combinados caso a caso, com transparência total antes de qualquer ação. Em muitos casos operamos no modelo de êxito, sem custo inicial." },
          { q: "Como sei se meus juros são abusivos?", r: "O Banco Central regula os limites de juros por modalidade de crédito. Taxas que excedem a média do mercado ou que crescem exponencialmente podem ser contestadas judicialmente." },
          { q: "Precisa ir ao escritório presencialmente?", r: "Não. Todo o processo pode ser conduzido de forma remota, com assinatura digital de documentos." },
        ].map((item, i) => <FaqItem key={i} q={item.q} r={item.r} GL={GL} />)}
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: isMobile ? "28px 20px" : "40px 32px", background: "rgba(0,0,0,0.2)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", flexDirection: isMobile ? "column" : "row", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span>⚖️</span>
              <span style={{ fontFamily: "Georgia, serif", color: GL, fontWeight: "bold", fontSize: 14 }}>Dívida Justa</span>
            </div>
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>Uma iniciativa de Marques & Cunha Advogados</div>
          </div>
          <div>
            <a href="https://instagram.com/marquesecunha.adv" target="_blank" rel="noreferrer" style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, textDecoration: "none" }}>📸 @marquesecunha.adv</a>
            <div style={{ color: "rgba(255,255,255,0.15)", fontSize: 10, marginTop: 6 }}>As análises são preliminares e não constituem parecer jurídico.</div>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes djBounce { 0%,60%,100%{transform:translateY(0);opacity:.5} 30%{transform:translateY(-5px);opacity:1} }
        @keyframes djPulse { 0%,100%{opacity:1} 50%{opacity:.35} }
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(201,168,76,.25);border-radius:2px}
      `}</style>
    </div>
  );
}

function FaqItem({ q, r, GL }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "16px 0" }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left", gap: 12 }}>
        <span style={{ color: "rgba(255,255,255,0.82)", fontSize: 14, fontFamily: "Georgia, serif", lineHeight: 1.5 }}>{q}</span>
        <span style={{ color: GL, fontSize: 20, flexShrink: 0, transition: "transform 0.2s", transform: open ? "rotate(45deg)" : "none", display: "block" }}>+</span>
      </button>
      {open && <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, lineHeight: 1.8, marginTop: 10, paddingRight: 8 }}>{r}</p>}
    </div>
  );
}
