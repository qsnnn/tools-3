"use client";

import { ChangeEvent, ReactNode, useEffect, useMemo, useState } from "react";

type ReceiptData = {
  brandName: string;
  documentFamily: string;
  generatedAt: string;
  transactionReference: string;
  telegraphicReference: string;
  bankLocation: string;
  beneficiaryAccount: string;
  paymentCurrency: string;
  beneficiaryName: string;
  beneficiaryBankName: string;
  beneficiaryBankAddress: string;
  beneficiarySwift: string;
  sourceAccountType: string;
  sourceAccountDetail: string;
  paymentAmount: string;
  feeNotice: string;
  transferNotice: string;
  paymentDate: string;
  paymentDateNotice: string;
  chargePolicy: string;
  footerAddress: string;
};

type Draft = {
  data: ReceiptData;
  logo: string;
};

const STORAGE_KEY = "transfer-receipt-layout-v3";

const defaults: ReceiptData = {
  brandName: "NORTHSTAR",
  documentFamily: "Third Party Account / autoPay - Business Internet Banking",
  generatedAt: "7/18/26, 09:58",
  transactionReference: "N71847749704",
  telegraphicReference: "HK118076B5198045",
  bankLocation: "UNITED STATES",
  beneficiaryAccount: "138129149332",
  paymentCurrency: "USD",
  beneficiaryName: "KAS CUSTOMS SERVICES LLC",
  beneficiaryBankName: "EXAMPLE BANK, NATIONAL ASSOCIATION",
  beneficiaryBankAddress: "222 BROADWAY AVENUE\nNEW YORK NY 10038\nUNITED STATES",
  beneficiarySwift: "EXAMUS3NXXX",
  sourceAccountType: "USD Savings",
  sourceAccountDetail: "817-862485-838   -   Business Integrated USD Savings",
  paymentAmount: "247,890.00",
  feeNotice:
    "Other fees and charges may apply. For details, please refer to the applicable commercial tariff. Please check the transaction history on or after the payment date to confirm the transaction details.",
  transferNotice:
    "If we are unable to process this payment via RTGS, we will process it as a telegraphic transfer and the corresponding charges will apply. However, the related advice will still show 'Bank Fund Transfer' and not 'Outward Remittance'.",
  paymentDate: "Today, Saturday 18 Jul 2026",
  paymentDateNotice:
    "Transaction requests submitted during business hours on a working day will be processed on the same day. Requests submitted at other times (e.g. on a public holiday) will be processed on the next working day.",
  chargePolicy: "The beneficiary pays all bank charges.",
  footerAddress: "document-template.local/payments/acknowledgement",
};

function TextField({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="editor-field">
      <span>{label}</span>
      {multiline ? (
        <textarea value={value} rows={3} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

function ReceiptField({ label, value }: { label: ReactNode; value: string }) {
  return (
    <div className="receipt-field">
      <div className="receipt-label">{label}</div>
      <div className="receipt-value">{value || "-"}</div>
    </div>
  );
}

function RunningHeader({ data }: { data: ReceiptData }) {
  return (
    <div className="running-header">
      <span>{data.documentFamily}</span>
      <span>{data.generatedAt}</span>
    </div>
  );
}

function PageFooter({ data, page }: { data: ReceiptData; page: number }) {
  return (
    <footer className="receipt-footer">
      <span>{data.footerAddress}</span>
      <span>Page {page} of 2</span>
    </footer>
  );
}

function SafetyMarks() {
  return (
    <>
      <div className="sample-banner">SAMPLE · NOT BANK ISSUED</div>
      <div className="sample-watermark">SAMPLE · NOT BANK ISSUED</div>
    </>
  );
}

export default function Home() {
  const [data, setData] = useState<ReceiptData>(defaults);
  const [logo, setLogo] = useState("");
  const [status, setStatus] = useState("已就绪");
  const [hydrated, setHydrated] = useState(false);

  const initials = useMemo(
    () =>
      data.brandName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase(),
    [data.brandName],
  );

  const update = <K extends keyof ReceiptData>(key: K, value: ReceiptData[K]) => {
    setData((current) => ({ ...current, [key]: value }));
  };

  const save = (showStatus = true) => {
    const draft: Draft = { data, logo };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    if (showStatus) setStatus("草稿已保存");
  };

  const load = () => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setStatus("没有找到已保存草稿");
      return;
    }
    try {
      const draft = JSON.parse(raw) as Draft;
      setData({ ...defaults, ...draft.data });
      setLogo(draft.logo || "");
      setStatus("草稿已读取");
    } catch {
      setStatus("草稿读取失败");
    }
  };

  const reset = () => {
    if (!window.confirm("确认恢复默认内容？")) return;
    setData(defaults);
    setLogo("");
    window.localStorage.removeItem(STORAGE_KEY);
    setStatus("已恢复默认内容");
  };

  const handleLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setStatus("Logo 仅支持 PNG、JPG 或 WebP");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setStatus("Logo 不能超过 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogo(typeof reader.result === "string" ? reader.result : "");
      setStatus("Logo 已更新");
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const draft = JSON.parse(raw) as Draft;
        setData({ ...defaults, ...draft.data });
        setLogo(draft.logo || "");
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => save(false), 700);
    return () => window.clearTimeout(timer);
  }, [data, logo, hydrated]);

  return (
    <main className="app-shell">
      <header className="app-bar">
        <div>
          <strong>回执模板编辑器</strong>
          <span>严格按参考 PDF 的两页结构排版</span>
        </div>
        <div className="app-actions">
          <span className="save-status" aria-live="polite">{status}</span>
          <button type="button" onClick={load}>读取</button>
          <button type="button" onClick={() => save(true)}>保存</button>
          <button type="button" onClick={reset}>重置</button>
          <button type="button" className="primary-action" onClick={() => window.print()}>打印 / 导出 PDF</button>
        </div>
      </header>

      <div className="workspace">
        <aside className="editor-panel">
          <div className="editor-intro">
            <h1>编辑回执内容</h1>
            <p>右侧回执的字段顺序、分栏、分页和留白固定，仅内容可修改。</p>
          </div>

          <section className="editor-section">
            <h2>品牌与页眉</h2>
            <label className="logo-upload">
              <span className="logo-preview">
                {logo ? <img src={logo} alt="上传的品牌 Logo" /> : initials || "NS"}
              </span>
              <span><b>上传 Logo</b><small>PNG / JPG / WebP，最大 2MB</small></span>
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogo} />
            </label>
            <div className="editor-grid">
              <TextField label="品牌名称" value={data.brandName} onChange={(value) => update("brandName", value)} />
              <TextField label="页眉标题" value={data.documentFamily} onChange={(value) => update("documentFamily", value)} />
              <TextField label="生成时间" value={data.generatedAt} onChange={(value) => update("generatedAt", value)} />
              <TextField label="页脚地址" value={data.footerAddress} onChange={(value) => update("footerAddress", value)} />
            </div>
          </section>

          <section className="editor-section">
            <h2>Reference</h2>
            <div className="editor-grid">
              <TextField label="Transaction reference number" value={data.transactionReference} onChange={(value) => update("transactionReference", value)} />
              <TextField label="Telegraphic transfer reference number" value={data.telegraphicReference} onChange={(value) => update("telegraphicReference", value)} />
            </div>
          </section>

          <section className="editor-section">
            <h2>Pay to</h2>
            <div className="editor-grid">
              <TextField label="Beneficiary bank location" value={data.bankLocation} onChange={(value) => update("bankLocation", value)} />
              <TextField label="Beneficiary account number / IBAN" value={data.beneficiaryAccount} onChange={(value) => update("beneficiaryAccount", value)} />
              <TextField label="Payment currency" value={data.paymentCurrency} onChange={(value) => update("paymentCurrency", value)} />
              <TextField label="Beneficiary name" value={data.beneficiaryName} onChange={(value) => update("beneficiaryName", value)} />
              <TextField label="Beneficiary bank name" value={data.beneficiaryBankName} onChange={(value) => update("beneficiaryBankName", value)} />
              <TextField label="Beneficiary bank address" value={data.beneficiaryBankAddress} onChange={(value) => update("beneficiaryBankAddress", value)} multiline />
              <TextField label="Beneficiary bank code / SWIFT" value={data.beneficiarySwift} onChange={(value) => update("beneficiarySwift", value)} />
            </div>
          </section>

          <section className="editor-section">
            <h2>From 与 Amount</h2>
            <div className="editor-grid">
              <TextField label="账户类型" value={data.sourceAccountType} onChange={(value) => update("sourceAccountType", value)} />
              <TextField label="付款账户说明" value={data.sourceAccountDetail} onChange={(value) => update("sourceAccountDetail", value)} />
              <TextField label="付款金额" value={data.paymentAmount} onChange={(value) => update("paymentAmount", value)} />
              <TextField label="费用提示" value={data.feeNotice} onChange={(value) => update("feeNotice", value)} multiline />
            </div>
          </section>

          <section className="editor-section">
            <h2>第二页</h2>
            <div className="editor-grid">
              <TextField label="电汇说明" value={data.transferNotice} onChange={(value) => update("transferNotice", value)} multiline />
              <TextField label="付款日期" value={data.paymentDate} onChange={(value) => update("paymentDate", value)} />
              <TextField label="日期处理说明" value={data.paymentDateNotice} onChange={(value) => update("paymentDateNotice", value)} multiline />
              <TextField label="费用承担" value={data.chargePolicy} onChange={(value) => update("chargePolicy", value)} />
            </div>
          </section>
        </aside>

        <section className="preview-panel" aria-label="回执预览">
          <article className="receipt-page page-one">
            <RunningHeader data={data} />
            <SafetyMarks />

            <div className="page-one-content">
              <div className="receipt-brand">
                {logo ? (
                  <img src={logo} alt="品牌 Logo" />
                ) : (
                  <>
                    <span className="wordmark">{data.brandName}</span>
                    <span className="fictional-mark" aria-hidden="true"><i /><i /></span>
                  </>
                )}
              </div>

              <section className="receipt-section reference-section">
                <h2>Reference</h2>
                <div className="two-column-fields">
                  <ReceiptField label="Transaction reference number" value={data.transactionReference} />
                  <ReceiptField label={<>Telegraphic transfer reference<br />number</>} value={data.telegraphicReference} />
                </div>
              </section>

              <section className="receipt-section ruled payto-section">
                <h2>Pay to</h2>
                <div className="payto-grid">
                  <div className="payto-left">
                    <ReceiptField label="Beneficiary bank location" value={data.bankLocation} />
                    <ReceiptField label="Payment currency" value={data.paymentCurrency} />
                    <ReceiptField label="Beneficiary bank name" value={data.beneficiaryBankName} />
                    <ReceiptField label="Beneficiary bank address" value={data.beneficiaryBankAddress} />
                    <ReceiptField label="Beneficiary bank code/ SWIFT address" value={data.beneficiarySwift} />
                  </div>
                  <div className="payto-right">
                    <ReceiptField label="Beneficiary account number / IBAN" value={data.beneficiaryAccount} />
                    <ReceiptField label="Beneficiary name" value={data.beneficiaryName} />
                  </div>
                </div>
                <p className="verification-copy">Name checking may not be conducted in the fund transfer. Please carefully verify the payee’s account number and other payment details.</p>
              </section>

              <section className="receipt-section ruled compact-section">
                <h2>From</h2>
                <div className="source-block">
                  <strong>{data.sourceAccountType}</strong>
                  <p>{data.sourceAccountDetail}</p>
                </div>
              </section>

              <section className="receipt-section ruled amount-section">
                <h2>Amount</h2>
                <div className="amount-block">
                  <span>Payment amount</span>
                  <p><small>{data.paymentCurrency}</small> {data.paymentAmount}</p>
                </div>
                <p className="fee-copy">{data.feeNotice}</p>
              </section>

              <section className="receipt-section ruled settlement-section">
                <h2>Settlement option</h2>
              </section>
            </div>

            <PageFooter data={data} page={1} />
          </article>

          <article className="receipt-page page-two">
            <RunningHeader data={data} />
            <SafetyMarks />

            <div className="page-two-content">
              <section className="page-two-lead">
                <h3>Telegraphic transfer</h3>
                <p>{data.transferNotice}</p>
              </section>

              <section className="receipt-section ruled second-page-section">
                <h2>Payment date</h2>
                <strong>{data.paymentDate}</strong>
                <p>{data.paymentDateNotice}</p>
              </section>

              <section className="receipt-section ruled second-page-section charge-section">
                <h2>Who pays local / overseas charges</h2>
                <strong>{data.chargePolicy}</strong>
              </section>
            </div>

            <PageFooter data={data} page={2} />
          </article>
        </section>
      </div>
    </main>
  );
}
