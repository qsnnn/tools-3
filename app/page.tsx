"use client";

import { ChangeEvent, CSSProperties, useEffect, useMemo, useState } from "react";

type OutputLanguage = "en" | "zh";

type RecordData = {
  brandName: string;
  brandTagline: string;
  accent: string;
  documentTitle: string;
  reference: string;
  secondaryReference: string;
  beneficiaryCountry: string;
  beneficiaryName: string;
  beneficiaryBank: string;
  accountIdentifier: string;
  swift: string;
  payerName: string;
  payerAccount: string;
  currency: string;
  amount: string;
  transferMethod: string;
  paymentDate: string;
  feePolicy: string;
  memo: string;
  language: OutputLanguage;
};

type SavedDraft = {
  data: RecordData;
  logo: string;
  maskAccount: boolean;
  savedAt: string;
};

const STORAGE_KEY = "recordcraft-payment-draft-v1";

const initialData: RecordData = {
  brandName: "Northstar Trading",
  brandTagline: "Operations record",
  accent: "#155eef",
  documentTitle: "Customer Payment Record",
  reference: "PAY-2026-0718-0042",
  secondaryReference: "CLIENT-PO-1847",
  beneficiaryCountry: "United States",
  beneficiaryName: "Example Services LLC",
  beneficiaryBank: "Beneficiary bank (customer provided)",
  accountIdentifier: "•••• •••• 4932",
  swift: "CUSTOMER-PROVIDED",
  payerName: "Northstar Trading",
  payerAccount: "Operations account •••• 0838",
  currency: "USD",
  amount: "24,780.00",
  transferMethod: "International transfer",
  paymentDate: "2026-07-18",
  feePolicy: "Fees recorded separately",
  memo: "Consulting services - July 2026",
  language: "en",
};

const labels = {
  en: {
    documentType: "Customer-provided payment record",
    reference: "Record reference",
    secondaryReference: "Related reference",
    payTo: "Pay to",
    country: "Beneficiary country / region",
    beneficiary: "Beneficiary name",
    bank: "Beneficiary bank",
    account: "Account identifier",
    swift: "Bank code / SWIFT",
    from: "Recorded payer",
    payer: "Payer name",
    payerAccount: "Payer account",
    amount: "Recorded amount",
    method: "Transfer method",
    date: "Recorded payment date",
    fees: "Fee handling",
    memo: "Purpose / memo",
    details: "Record details",
    noticeTitle: "Important notice",
    notice:
      "This document is created from customer-entered information. It is not issued by a bank, does not confirm settlement, and must not be used as proof of payment.",
    appendix: "Record notes & verification",
    verifyTitle: "How to verify a transfer",
    verifyBody:
      "Confirm settlement directly in the sender's banking portal or with the receiving institution. Match the value date, amount, beneficiary and official bank reference before releasing goods or services.",
    sourceTitle: "Data source",
    sourceBody:
      "All values shown in this record were entered by the user in RecordCraft. No banking system or payment network was queried.",
    footer: "RecordCraft · Customer record · Not bank issued",
    watermark: "SAMPLE · NOT BANK ISSUED",
  },
  zh: {
    documentType: "客户自行填写的付款记录",
    reference: "记录编号",
    secondaryReference: "关联编号",
    payTo: "收款信息",
    country: "收款国家 / 地区",
    beneficiary: "收款方名称",
    bank: "收款方银行",
    account: "账户标识",
    swift: "银行代码 / SWIFT",
    from: "付款方记录",
    payer: "付款方名称",
    payerAccount: "付款账户",
    amount: "记录金额",
    method: "转账方式",
    date: "记录付款日期",
    fees: "费用承担",
    memo: "用途 / 备注",
    details: "记录详情",
    noticeTitle: "重要说明",
    notice:
      "本文件根据客户自行填写的信息生成，并非银行出具，不代表资金已经结算，也不得作为真实付款证明使用。",
    appendix: "记录说明与核验",
    verifyTitle: "如何核验转账",
    verifyBody:
      "请直接登录付款方银行系统或联系收款机构核验到账情况。在交付货物或服务前，应核对入账日期、金额、收款方与银行官方参考编号。",
    sourceTitle: "数据来源",
    sourceBody:
      "本记录中的全部信息均由用户在 RecordCraft 中自行输入，系统未连接任何银行或支付网络。",
    footer: "RecordCraft · 客户记录 · 非银行出具",
    watermark: "示例 · 非银行出具",
  },
};

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "date";
  placeholder?: string;
  error?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
      />
      {error ? <small className="field-error">{error}</small> : null}
    </label>
  );
}

function PreviewValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="preview-value">
      <dt>{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}

function maskIdentifier(value: string) {
  const compact = value.replace(/\s/g, "");
  if (compact.length <= 4) return value;
  return `•••• •••• ${compact.slice(-4)}`;
}

function formatRecordDate(value: string, language: OutputLanguage) {
  if (!value) return "—";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatAmount(currency: string, amount: string) {
  const numeric = Number(amount.replace(/,/g, ""));
  if (!Number.isFinite(numeric)) return `${currency} ${amount}`.trim();
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      currencyDisplay: "code",
      minimumFractionDigits: 2,
    }).format(numeric);
  } catch {
    return `${currency} ${numeric.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  }
}

export default function Home() {
  const [data, setData] = useState<RecordData>(initialData);
  const [logo, setLogo] = useState("");
  const [maskAccount, setMaskAccount] = useState(true);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("自动保存已开启");
  const [logoError, setLogoError] = useState("");

  const copy = labels[data.language];
  const errors = useMemo(() => {
    const next: Record<string, string> = {};
    if (!data.brandName.trim()) next.brandName = "请输入你的企业或团队名称";
    if (!data.reference.trim()) next.reference = "记录编号不能为空";
    if (!data.beneficiaryName.trim()) next.beneficiaryName = "请输入收款方名称";
    if (!data.paymentDate) next.paymentDate = "请选择记录日期";
    const amount = Number(data.amount.replace(/,/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) next.amount = "请输入有效的正数金额";
    return next;
  }, [data]);

  const update = <K extends keyof RecordData>(key: K, value: RecordData[K]) => {
    setData((current) => ({ ...current, [key]: value }));
  };

  const readDraft = () => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setStatus("没有找到已保存草稿");
      return;
    }
    try {
      const draft = JSON.parse(raw) as SavedDraft;
      setData({ ...initialData, ...draft.data });
      setLogo(draft.logo || "");
      setMaskAccount(draft.maskAccount ?? true);
      setStatus(`已载入 ${new Date(draft.savedAt).toLocaleString("zh-CN")}`);
    } catch {
      setStatus("草稿已损坏，无法载入");
    }
  };

  const saveDraft = (showStatus = true) => {
    const draft: SavedDraft = {
      data,
      logo,
      maskAccount,
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    if (showStatus) setStatus("草稿已保存到这台设备");
  };

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const draft = JSON.parse(raw) as SavedDraft;
        setData({ ...initialData, ...draft.data });
        setLogo(draft.logo || "");
        setMaskAccount(draft.maskAccount ?? true);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      saveDraft(false);
      setStatus("所有更改已自动保存");
    }, 500);
    return () => window.clearTimeout(timer);
  }, [data, logo, maskAccount, ready]);

  const handleLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLogoError("");
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setLogoError("请上传 PNG、JPG 或 WebP 图片");
      event.target.value = "";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError("图片请控制在 2 MB 以内");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogo(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(file);
  };

  const resetDraft = () => {
    if (!window.confirm("恢复示例数据？你当前的本地草稿会被替换。")) return;
    setData(initialData);
    setLogo("");
    setMaskAccount(true);
    window.localStorage.removeItem(STORAGE_KEY);
    setStatus("已恢复安全示例数据");
  };

  const printRecord = () => {
    if (Object.keys(errors).length > 0) {
      setStatus("请先修正标红字段，再导出 PDF");
      return;
    }
    window.print();
  };

  const initials = data.brandName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase() || "RC";

  return (
    <main className="app-shell" style={{ "--brand": data.accent } as CSSProperties}>
      <header className="app-header">
        <div className="app-brand">
          <span className="app-brand-mark">R</span>
          <span>
            <strong>RecordCraft</strong>
            <small>付款记录工作台</small>
          </span>
        </div>
        <div className="header-actions">
          <span className="save-status" aria-live="polite"><i />{status}</span>
          <button className="button button-ghost" type="button" onClick={readDraft}>载入</button>
          <button className="button button-ghost" type="button" onClick={() => saveDraft(true)}>保存</button>
          <button className="button button-ghost danger" type="button" onClick={resetDraft}>重置</button>
          <button className="button button-primary" type="button" onClick={printRecord}>打印 / 导出 PDF</button>
        </div>
      </header>

      <section className="safety-banner">
        <strong>安全模板</strong>
        <span>用于内部付款记录与客户沟通；导出内容始终标注“非银行出具”。</span>
      </section>

      <div className="workspace">
        <aside className="editor-panel">
          <div className="editor-intro">
            <div>
              <span className="eyebrow">LIVE DOCUMENT</span>
              <h1>填写一次，实时生成</h1>
              <p>所有数据只保存在当前浏览器，不会上传到服务器。</p>
            </div>
            <div className="language-switch" aria-label="文档语言">
              <button className={data.language === "zh" ? "active" : ""} onClick={() => update("language", "zh")} type="button">中</button>
              <button className={data.language === "en" ? "active" : ""} onClick={() => update("language", "en")} type="button">EN</button>
            </div>
          </div>

          <div className="form-section">
            <div className="section-title"><span>01</span><div><h2>品牌与文档</h2><p>使用你有权使用的企业标识</p></div></div>
            <div className="logo-uploader">
              <div className="logo-thumb">
                {logo ? <img src={logo} alt="自定义企业 Logo" /> : <span>{initials}</span>}
              </div>
              <div>
                <label className="upload-button">
                  上传自有 Logo
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogo} />
                </label>
                <p>PNG / JPG / WebP，最大 2 MB。请勿使用银行官方标识。</p>
                {logoError ? <small className="field-error">{logoError}</small> : null}
              </div>
            </div>
            <div className="form-grid">
              <Field label="企业 / 团队名称" value={data.brandName} onChange={(value) => update("brandName", value)} error={errors.brandName} />
              <Field label="品牌副标题" value={data.brandTagline} onChange={(value) => update("brandTagline", value)} />
              <Field label="文档标题" value={data.documentTitle} onChange={(value) => update("documentTitle", value)} />
              <label className="field color-field"><span>品牌色</span><div><input type="color" value={data.accent} onChange={(event) => update("accent", event.target.value)} /><code>{data.accent.toUpperCase()}</code></div></label>
            </div>
          </div>

          <div className="form-section">
            <div className="section-title"><span>02</span><div><h2>参考编号</h2><p>便于内部检索与对账</p></div></div>
            <div className="form-grid">
              <Field label="记录编号" value={data.reference} onChange={(value) => update("reference", value)} error={errors.reference} />
              <Field label="关联编号" value={data.secondaryReference} onChange={(value) => update("secondaryReference", value)} />
            </div>
          </div>

          <div className="form-section">
            <div className="section-title"><span>03</span><div><h2>收款信息</h2><p>按客户提供的信息记录</p></div></div>
            <div className="form-grid">
              <Field label="收款国家 / 地区" value={data.beneficiaryCountry} onChange={(value) => update("beneficiaryCountry", value)} />
              <Field label="收款方名称" value={data.beneficiaryName} onChange={(value) => update("beneficiaryName", value)} error={errors.beneficiaryName} />
              <Field label="收款方银行" value={data.beneficiaryBank} onChange={(value) => update("beneficiaryBank", value)} />
              <Field label="账户标识" value={data.accountIdentifier} onChange={(value) => update("accountIdentifier", value)} />
              <Field label="银行代码 / SWIFT" value={data.swift} onChange={(value) => update("swift", value)} />
              <label className="toggle-field"><span><strong>隐藏敏感账户信息</strong><small>预览仅显示末四位</small></span><input type="checkbox" checked={maskAccount} onChange={(event) => setMaskAccount(event.target.checked)} /></label>
            </div>
          </div>

          <div className="form-section">
            <div className="section-title"><span>04</span><div><h2>付款详情</h2><p>金额、日期与用途</p></div></div>
            <div className="form-grid">
              <Field label="付款方名称" value={data.payerName} onChange={(value) => update("payerName", value)} />
              <Field label="付款账户" value={data.payerAccount} onChange={(value) => update("payerAccount", value)} />
              <Field label="币种" value={data.currency} onChange={(value) => update("currency", value.toUpperCase())} />
              <Field label="金额" value={data.amount} onChange={(value) => update("amount", value)} error={errors.amount} />
              <Field label="转账方式" value={data.transferMethod} onChange={(value) => update("transferMethod", value)} />
              <Field label="记录日期" type="date" value={data.paymentDate} onChange={(value) => update("paymentDate", value)} error={errors.paymentDate} />
              <Field label="费用承担" value={data.feePolicy} onChange={(value) => update("feePolicy", value)} />
              <Field label="用途 / 备注" value={data.memo} onChange={(value) => update("memo", value)} />
            </div>
          </div>
        </aside>

        <section className="preview-panel" aria-label="实时文档预览">
          <div className="preview-toolbar">
            <div><span className="pulse-dot" />实时预览</div>
            <span>A4 · 2 页</span>
          </div>
          <div className="document-stack">
            <article className="document-page">
              <div className="watermark">{copy.watermark}</div>
              <header className="document-header">
                <div className="document-brand">
                  {logo ? <img src={logo} alt={`${data.brandName} logo`} /> : <span className="document-logo">{initials}</span>}
                  <div><strong>{data.brandName || "Your company"}</strong><small>{data.brandTagline}</small></div>
                </div>
                <div className="record-chip"><i />USER-ENTERED RECORD</div>
              </header>
              <div className="document-hero">
                <span>{copy.documentType}</span>
                <h2>{data.documentTitle || "Payment record"}</h2>
                <p>{formatRecordDate(data.paymentDate, data.language)}</p>
              </div>

              <section className="preview-section reference-band">
                <dl>
                  <PreviewValue label={copy.reference} value={data.reference} />
                  <PreviewValue label={copy.secondaryReference} value={data.secondaryReference} />
                </dl>
              </section>

              <section className="preview-section">
                <h3><span>01</span>{copy.payTo}</h3>
                <dl className="preview-grid">
                  <PreviewValue label={copy.country} value={data.beneficiaryCountry} />
                  <PreviewValue label={copy.beneficiary} value={data.beneficiaryName} />
                  <PreviewValue label={copy.bank} value={data.beneficiaryBank} />
                  <PreviewValue label={copy.account} value={maskAccount ? maskIdentifier(data.accountIdentifier) : data.accountIdentifier} />
                  <PreviewValue label={copy.swift} value={data.swift} />
                </dl>
              </section>

              <section className="preview-section">
                <h3><span>02</span>{copy.from}</h3>
                <dl className="preview-grid two">
                  <PreviewValue label={copy.payer} value={data.payerName} />
                  <PreviewValue label={copy.payerAccount} value={maskAccount ? maskIdentifier(data.payerAccount) : data.payerAccount} />
                </dl>
              </section>

              <section className="amount-card">
                <div><small>{copy.amount}</small><strong>{formatAmount(data.currency, data.amount)}</strong></div>
                <span>RECORDED VALUE</span>
              </section>

              <section className="preview-section compact">
                <h3><span>03</span>{copy.details}</h3>
                <dl className="preview-grid two">
                  <PreviewValue label={copy.method} value={data.transferMethod} />
                  <PreviewValue label={copy.date} value={formatRecordDate(data.paymentDate, data.language)} />
                  <PreviewValue label={copy.fees} value={data.feePolicy} />
                  <PreviewValue label={copy.memo} value={data.memo} />
                </dl>
              </section>

              <div className="document-notice"><strong>{copy.noticeTitle}</strong><p>{copy.notice}</p></div>
              <footer className="document-footer"><span>{copy.footer}</span><span>Page 1 / 2</span></footer>
            </article>

            <article className="document-page appendix-page">
              <div className="watermark">{copy.watermark}</div>
              <header className="document-header">
                <div className="document-brand">
                  {logo ? <img src={logo} alt="" /> : <span className="document-logo">{initials}</span>}
                  <div><strong>{data.brandName || "Your company"}</strong><small>{data.reference}</small></div>
                </div>
                <div className="record-chip"><i />USER-ENTERED RECORD</div>
              </header>
              <div className="appendix-title"><span>APPENDIX</span><h2>{copy.appendix}</h2><p>{data.documentTitle}</p></div>
              <div className="verification-card"><span>01</span><div><h3>{copy.verifyTitle}</h3><p>{copy.verifyBody}</p></div></div>
              <div className="verification-card"><span>02</span><div><h3>{copy.sourceTitle}</h3><p>{copy.sourceBody}</p></div></div>
              <div className="audit-grid">
                <PreviewValue label={copy.reference} value={data.reference} />
                <PreviewValue label={copy.beneficiary} value={data.beneficiaryName} />
                <PreviewValue label={copy.amount} value={formatAmount(data.currency, data.amount)} />
                <PreviewValue label={copy.date} value={formatRecordDate(data.paymentDate, data.language)} />
              </div>
              <div className="signature-area"><span>Internal review</span><div /><small>Name / date / notes</small></div>
              <div className="document-notice large"><strong>{copy.noticeTitle}</strong><p>{copy.notice}</p></div>
              <footer className="document-footer"><span>{copy.footer}</span><span>Page 2 / 2</span></footer>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
