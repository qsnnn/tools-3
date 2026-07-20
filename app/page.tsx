"use client";

import { ChangeEvent, CSSProperties, useEffect, useMemo, useState } from "react";

type OutputLanguage = "en" | "zh";

type RecordData = {
  brandName: string;
  brandTagline: string;
  accent: string;
  statementTitle: string;
  referenceNo: string;
  valueDate: string;
  referenceNo2: string;
  beneficiaryCountry: string;
  beneficiaryName: string;
  beneficiaryBank: string;
  beneficiaryAccount: string;
  beneficiarySwift: string;
  payerName: string;
  payerAccount: string;
  payerReference: string;
  transferCurrency: string;
  transferAmount: string;
  settlementOption: string;
  feePolicy: string;
  paymentMethod: string;
  memo: string;
  language: OutputLanguage;
};

type SavedDraft = {
  data: RecordData;
  logo: string;
  maskAccount: boolean;
  savedAt: string;
};

const STORAGE_KEY = "payment-sheet-draft-v2";

const initialData: RecordData = {
  brandName: "Northstar Trading",
  brandTagline: "Operations Team",
  accent: "#0c4d97",
  statementTitle: "Telegraphic Transfer Confirmation",
  referenceNo: "TT TO KAS - 7.18",
  valueDate: "2026-07-18",
  referenceNo2: "CLIENT-PO-1847",
  beneficiaryCountry: "United States",
  beneficiaryName: "Lakeside Services LLC",
  beneficiaryBank: "Example Bank International",
  beneficiaryAccount: "ACCT 0004 9318 4029 8742",
  beneficiarySwift: "EXIMUS33",
  payerName: "Northstar Trading Co. Ltd",
  payerAccount: "ACCT 0908 3384 7721 1185",
  payerReference: "NS-2026-0718-A",
  transferCurrency: "USD",
  transferAmount: "24,780.00",
  settlementOption: "BENEFICIARY RECEIVES ALL CHARGES",
  feePolicy: "Our bank: SHA",
  paymentMethod: "International transfer (SWIFT)",
  memo: "Consulting services invoice 2026-07",
  language: "en",
};

const labels = {
  en: {
    brandBadge: "DOCUMENT TEMPLATE",
    statementType: "Customer-entered payment statement",
    reference: "Reference",
    secondaryRef: "Related reference",
    valueDate: "Value date",
    to: "Pay to",
    country: "Beneficiary country / region",
    beneficiary: "Beneficiary",
    bank: "Beneficiary bank",
    beneficiaryAccount: "Beneficiary account",
    swift: "SWIFT / bank code",
    from: "From",
    payerName: "Payer name",
    payerAccount: "Payer account",
    payerRef: "Payer reference",
    amount: "Amount",
    settlement: "Settlement option",
    fees: "Charge method",
    paymentMethod: "Transfer method",
    memo: "Payment purpose",
    page1: "Bank transfer advisory form",
    page2: "Appendix / declaration",
    verify: "Verification notes",
    watermark: "SAMPLE · NOT A BANK DOCUMENT",
    actions: {
      load: "Load",
      save: "Save",
      reset: "Reset",
      print: "Print / Export PDF",
    },
    status: {
      auto: "Auto-saved",
      ready: "Ready",
      saved: "Draft saved",
      loaded: "Draft loaded",
      empty: "No saved draft",
      parseFail: "Unable to parse saved draft",
      printBlock: "Please fix required fields before printing",
      reset: "Draft reset",
    },
    noticeTitle: "Important",
    notice:
      "This statement is generated from user input only and is not issued by any bank.",
    appendixNotice:
      "Any release of goods or service should be verified with the real bank and settlement platform.",
  },
  zh: {
    brandBadge: "单据模板",
    statementType: "客户填写的支付回单样本",
    reference: "参考号",
    secondaryRef: "关联参考号",
    valueDate: "到账日期",
    to: "收款人",
    country: "收款国家/地区",
    beneficiary: "收款人名称",
    bank: "收款行",
    beneficiaryAccount: "收款账号",
    swift: "SWIFT / 行号",
    from: "付款方",
    payerName: "付款人名称",
    payerAccount: "付款账号",
    payerRef: "付款方参考号",
    amount: "金额",
    settlement: "结算方式",
    fees: "手续费",
    paymentMethod: "支付方式",
    memo: "用途备注",
    page1: "银行转账凭证（演示）",
    page2: "附页 / 声明",
    verify: "核验说明",
    watermark: "示例文件 · 非银行出具",
    actions: {
      load: "读取",
      save: "保存",
      reset: "重置",
      print: "打印 / 导出 PDF",
    },
    status: {
      auto: "自动保存",
      ready: "已就绪",
      saved: "草稿已保存",
      loaded: "已读取草稿",
      empty: "未找到保存草稿",
      parseFail: "草稿解析失败",
      printBlock: "请先完善必填信息后再打印",
      reset: "已重置为默认内容",
    },
    noticeTitle: "提示",
    notice: "本页面仅用于教学演示，字段内容由用户填入，非银行正式文件。",
    appendixNotice: "发货/放行前请以银行流水和收款方确认信息为准。",
  },
};

type FieldError = Record<string, string>;

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

function KVP({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`kv ${className || ""}`}>
      <dt>{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}

function formatAmount(currency: string, amount: string) {
  const amountNumber = Number(amount.replace(/,/g, ""));
  if (!Number.isFinite(amountNumber)) {
    return `${currency} ${amount}`.trim();
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    currencyDisplay: "code",
    minimumFractionDigits: 2,
  }).format(amountNumber);
}

function formatDate(value: string, language: OutputLanguage) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function mask(value: string) {
  const plain = value.replace(/\s/g, "");
  if (plain.length <= 4) return value;
  return `*** **** **** ${plain.slice(-4)}`;
}

export default function Home() {
  const [data, setData] = useState<RecordData>(initialData);
  const [logo, setLogo] = useState("");
  const [maskAccount, setMaskAccount] = useState(true);
  const [status, setStatus] = useState(labels[data.language].status.ready);
  const [ready, setReady] = useState(false);
  const [logoError, setLogoError] = useState("");
  const [statusSaved, setStatusSaved] = useState(false);

  const copy = labels[data.language];
  const initials = data.brandName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const errors = useMemo<FieldError>(() => {
    const result: FieldError = {};
    if (!data.brandName.trim()) result.brandName = "Brand is required.";
    if (!data.referenceNo.trim()) result.referenceNo = "Reference number is required.";
    if (!data.beneficiaryName.trim()) result.beneficiaryName = "Beneficiary name is required.";
    if (!data.payerName.trim()) result.payerName = "Payer name is required.";
    if (!data.transferAmount.trim()) result.transferAmount = "Amount is required.";
    if (!data.valueDate) result.valueDate = "Value date is required.";

    const amountNum = Number(data.transferAmount.replace(/,/g, ""));
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      result.transferAmount = "Enter a positive number.";
    }

    return result;
  }, [data]);

  const update = <K extends keyof RecordData>(key: K, value: RecordData[K]) => {
    setData((current) => ({ ...current, [key]: value }));
  };

  const saveDraft = (showStatus = true) => {
    const draft: SavedDraft = {
      data,
      logo,
      maskAccount,
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    if (showStatus) setStatus(copy.status.saved);
  };

  const loadDraft = () => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setStatus(copy.status.empty);
      return;
    }
    try {
      const draft = JSON.parse(raw) as SavedDraft;
      setData({ ...initialData, ...draft.data });
      setLogo(draft.logo || "");
      setMaskAccount(draft.maskAccount ?? true);
      setStatus(copy.status.loaded);
    } catch {
      setStatus(copy.status.parseFail);
    }
  };

  const resetDraft = () => {
    if (!window.confirm("Reset all content to the default template?")) return;
    setData(initialData);
    setLogo("");
    setMaskAccount(true);
    window.localStorage.removeItem(STORAGE_KEY);
    setStatus(copy.status.reset);
  };

  const handleLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLogoError("");

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setLogoError("Only PNG, JPG, and WebP are allowed.");
      event.target.value = "";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError("Image size should be less than 2MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setLogo(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(file);
  };

  const printRecord = () => {
    if (Object.keys(errors).length > 0) {
      setStatus(copy.status.printBlock);
      return;
    }
    window.print();
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
      setStatus((current) => (statusSaved ? copy.status.auto : current));
      setStatusSaved(false);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [data, logo, maskAccount, copy.status, ready, statusSaved]);

  useEffect(() => {
    if (!ready) return;
    setStatusSaved(true);
  }, [data, logo, maskAccount, ready]);

  return (
    <main className="sheet-shell" style={{ "--brand": data.accent } as CSSProperties}>
      <header className="topbar">
        <div className="topbar-brand">
          <div className="mini-logo">{initials}</div>
          <div>
            <strong>{data.brandName || "Brand"}</strong>
            <span>{data.brandTagline}</span>
          </div>
        </div>
        <div className="topbar-actions">
          <span className="status" aria-live="polite">{status}</span>
          <button className="btn ghost" type="button" onClick={loadDraft}>{copy.actions.load}</button>
          <button className="btn ghost" type="button" onClick={() => saveDraft(true)}>{copy.actions.save}</button>
          <button className="btn ghost danger" type="button" onClick={resetDraft}>{copy.actions.reset}</button>
          <button className="btn primary" type="button" onClick={printRecord}>{copy.actions.print}</button>
        </div>
      </header>

      <section className="split">
        <aside className="editor">
          <div className="pane-head">
            <p className="kicker">{copy.brandBadge}</p>
            <h1>{copy.page1}</h1>
            <p>{copy.notice}</p>
            <div className="lang-toggle">
              <button type="button" className={data.language === "en" ? "active" : ""} onClick={() => update("language", "en")}>EN</button>
              <button type="button" className={data.language === "zh" ? "active" : ""} onClick={() => update("language", "zh")}>中文</button>
            </div>
          </div>

          <div className="card">
            <h2>Brand and style</h2>
            <div className="logo-block">
              <div className="logo-preview">{logo ? <img src={logo} alt="Brand logo" /> : <span>{initials}</span>}</div>
              <div>
                <label className="upload">
                  Upload logo
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogo} />
                </label>
                <p>PNG/JPG/WebP, max 2MB</p>
                {logoError ? <small className="field-error">{logoError}</small> : null}
              </div>
            </div>
            <div className="grid">
              <Field label="Brand name" value={data.brandName} onChange={(value) => update("brandName", value)} error={errors.brandName} />
              <Field label="Tagline" value={data.brandTagline} onChange={(value) => update("brandTagline", value)} />
              <Field label="Statement title" value={data.statementTitle} onChange={(value) => update("statementTitle", value)} />
              <label className="field color-field">
                <span>Accent color</span>
                <input type="color" value={data.accent} onChange={(event) => update("accent", event.target.value)} />
              </label>
            </div>
          </div>

          <div className="card">
            <h2>References</h2>
            <div className="grid">
              <Field label={copy.reference} value={data.referenceNo} onChange={(value) => update("referenceNo", value)} error={errors.referenceNo} />
              <Field label={copy.secondaryRef} value={data.referenceNo2} onChange={(value) => update("referenceNo2", value)} />
              <Field label={copy.valueDate} type="date" value={data.valueDate} onChange={(value) => update("valueDate", value)} error={errors.valueDate} />
            </div>
          </div>

          <div className="card">
            <h2>{copy.to}</h2>
            <div className="grid">
              <Field label={copy.country} value={data.beneficiaryCountry} onChange={(value) => update("beneficiaryCountry", value)} />
              <Field label={copy.beneficiary} value={data.beneficiaryName} onChange={(value) => update("beneficiaryName", value)} error={errors.beneficiaryName} />
              <Field label={copy.bank} value={data.beneficiaryBank} onChange={(value) => update("beneficiaryBank", value)} />
              <Field label={copy.beneficiaryAccount} value={data.beneficiaryAccount} onChange={(value) => update("beneficiaryAccount", value)} />
              <Field label={copy.swift} value={data.beneficiarySwift} onChange={(value) => update("beneficiarySwift", value)} />
            </div>
            <label className="toggle">
              <span>Hide full account numbers</span>
              <input type="checkbox" checked={maskAccount} onChange={(event) => setMaskAccount(event.target.checked)} />
            </label>
          </div>

          <div className="card">
            <h2>{copy.from}</h2>
            <div className="grid">
              <Field label={copy.payerName} value={data.payerName} onChange={(value) => update("payerName", value)} error={errors.payerName} />
              <Field label={copy.payerAccount} value={data.payerAccount} onChange={(value) => update("payerAccount", value)} />
              <Field label={copy.payerRef} value={data.payerReference} onChange={(value) => update("payerReference", value)} />
            </div>
          </div>

          <div className="card">
            <h2>Amount and settlement</h2>
            <div className="grid">
              <Field label={copy.paymentMethod} value={data.paymentMethod} onChange={(value) => update("paymentMethod", value)} />
              <Field label={copy.settlement} value={data.settlementOption} onChange={(value) => update("settlementOption", value)} />
              <Field label={copy.fees} value={data.feePolicy} onChange={(value) => update("feePolicy", value)} />
                  <Field label={copy.amount} value={data.transferAmount} onChange={(value) => update("transferAmount", value)} error={errors.transferAmount} />
                  <Field label={copy.memo} value={data.memo} onChange={(value) => update("memo", value)} />
                  <Field label="Currency" value={data.transferCurrency} onChange={(value) => update("transferCurrency", value)} />
            </div>
          </div>
        </aside>

        <section className="preview" aria-label="Document preview">
          <div className="document-stack">
            <article className="doc-page">
              <div className="doc-watermark">{copy.watermark}</div>

              <header className="doc-titlebar">
                <div className="doc-brand">
                  <span className="doc-logo">{logo ? <img src={logo} alt="Logo" /> : <span>{initials}</span>}</span>
                  <div>
                    <small>{copy.statementType}</small>
                    <h1>{data.brandName}</h1>
                    <p>{data.brandTagline}</p>
                  </div>
                </div>
                <div className="chip">{copy.brandBadge}</div>
              </header>

              <section className="intro-band">
                <h2>{data.statementTitle}</h2>
                <div className="intro-meta">
                  <span>{copy.reference}: {data.referenceNo}</span>
                  <span>{copy.secondaryRef}: {data.referenceNo2}</span>
                  <span>{copy.valueDate}: {formatDate(data.valueDate, data.language)}</span>
                </div>
              </section>

              <section className="kv-section">
                <h3>{copy.to}</h3>
                <div className="kv-grid">
                  <KVP label={copy.country} value={data.beneficiaryCountry} />
                  <KVP label={copy.beneficiary} value={data.beneficiaryName} />
                  <KVP label={copy.bank} value={data.beneficiaryBank} />
                  <KVP label={copy.beneficiaryAccount} value={maskAccount ? mask(data.beneficiaryAccount) : data.beneficiaryAccount} />
                  <KVP label={copy.swift} value={data.beneficiarySwift} />
                </div>
              </section>

              <section className="kv-section">
                <h3>{copy.from}</h3>
                <div className="kv-grid">
                  <KVP label={copy.payerName} value={data.payerName} />
                  <KVP label={copy.payerAccount} value={maskAccount ? mask(data.payerAccount) : data.payerAccount} />
                  <KVP label={copy.payerRef} value={data.payerReference} className="full" />
                </div>
              </section>

              <section className="amount-strip">
                <div>
                  <small>{copy.amount}</small>
                  <strong>{formatAmount(data.transferCurrency, data.transferAmount)}</strong>
                  <p>Bank transfer · {data.paymentMethod}</p>
                </div>
                <div>
                  <small>{copy.settlement}</small>
                  <p>{data.settlementOption}</p>
                </div>
                <div>
                  <small>{copy.fees}</small>
                  <p>{data.feePolicy}</p>
                </div>
              </section>

              <section className="note">
                <small>{copy.memo}</small>
                <p>{data.memo || "—"}</p>
              </section>

              <footer className="doc-footer">
                <p>{copy.noticeTitle}: {copy.notice}</p>
                <span>Page 1 / 2</span>
              </footer>
            </article>

            <article className="doc-page">
              <div className="doc-watermark">{copy.watermark}</div>
              <header className="doc-titlebar">
                <div className="doc-brand">
                  <span className="doc-logo">{logo ? <img src={logo} alt="Logo" /> : <span>{initials}</span>}</span>
                  <div>
                    <small>{copy.page2}</small>
                    <h1>{copy.verify}</h1>
                  </div>
                </div>
                <div className="chip">{copy.brandBadge}</div>
              </header>

              <section className="appendix">
                <h3>Verification checklist</h3>
                <div className="appendix-grid">
                  <div>
                    <span>1</span>
                    <p>Compare the payer account, payee account, SWIFT code, and value date.</p>
                  </div>
                  <div>
                    <span>2</span>
                    <p>Match amount, reference, and memo before any release.</p>
                  </div>
                  <div>
                    <span>3</span>
                    <p>Confirm settlement with your bank statement and receiving bank confirmation.</p>
                  </div>
                  <div>
                    <span>4</span>
                    <p>Keep this record with invoice and approval chain.</p>
                  </div>
                </div>
                <div className="kv-summary">
                  <KVP label={copy.reference} value={data.referenceNo} />
                  <KVP label={copy.secondaryRef} value={data.referenceNo2} />
                  <KVP label={copy.amount} value={formatAmount(data.transferCurrency, data.transferAmount)} />
                  <KVP label={copy.valueDate} value={formatDate(data.valueDate, data.language)} />
                  <KVP label={copy.settlement} value={data.settlementOption} className="full" />
                  <KVP label={copy.memo} value={data.memo || "—"} className="full" />
                </div>
              </section>

              <section className="note">
                <small>{copy.noticeTitle}</small>
                <p>{copy.appendixNotice}</p>
              </section>

              <footer className="doc-footer">
                <p>{copy.notice}</p>
                <span>Page 2 / 2</span>
              </footer>
            </article>
          </div>
        </section>
      </section>
    </main>
  );
}
