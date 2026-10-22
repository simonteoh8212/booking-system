import type { DeskLanguageMode } from "@/types";

export interface BilingualText {
  zh: string;
  en: string;
}

export interface LanguageOption {
  id: DeskLanguageMode;
  label: string;
  subLabel: string;
  flag: string;
  description: string;
  previewPrimary: string;
  previewSecondary?: string;
}

export const DESK_LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    id: "BILINGUAL_ZH_FIRST",
    label: "中文优先 (双语)",
    subLabel: "Chinese Priority",
    flag: "🇨🇳",
    description: "大号中文醒目突出，下方配小号英文注释（适合华人老板与多元化员工）",
    previewPrimary: "收款开单",
    previewSecondary: "Count Sales",
  },
  {
    id: "BILINGUAL_EN_FIRST",
    label: "English First (Bilingual)",
    subLabel: "英文优先 (双语)",
    flag: "🇬🇧",
    description: "大号英文醒目突出，下方配小号中文注释（适合澳洲本土或英文为主习惯）",
    previewPrimary: "Count Sales",
    previewSecondary: "收款开单",
  },
  {
    id: "ONLY_ZH",
    label: "纯中文",
    subLabel: "Chinese Only",
    flag: "🇨🇳",
    description: "界面完全只显示中文，字体清晰简洁，无英文干扰",
    previewPrimary: "收款开单",
  },
  {
    id: "ONLY_EN",
    label: "English Only",
    subLabel: "纯英文",
    flag: "🇬🇧",
    description: "Pure English interface without Chinese characters",
    previewPrimary: "Count Sales",
  },
];

/**
 * Resolve display text based on language mode and priority.
 */
export function resolveDeskText(
  text: BilingualText,
  mode: DeskLanguageMode = "BILINGUAL_ZH_FIRST"
): { primary: string; secondary?: string } {
  switch (mode) {
    case "ONLY_ZH":
      return { primary: text.zh };
    case "ONLY_EN":
      return { primary: text.en };
    case "BILINGUAL_EN_FIRST":
      return { primary: text.en, secondary: text.zh };
    case "BILINGUAL_ZH_FIRST":
    default:
      return { primary: text.zh, secondary: text.en };
  }
}

/**
 * Resolve a single formatted label string based on language mode:
 * ONLY_ZH: "系统设置"
 * ONLY_EN: "Settings"
 * BILINGUAL_ZH_FIRST: "系统设置 (Settings)"
 * BILINGUAL_EN_FIRST: "Settings (系统设置)"
 */
export function resolveLabel(
  text: BilingualText,
  mode: DeskLanguageMode = "BILINGUAL_ZH_FIRST"
): string {
  switch (mode) {
    case "ONLY_ZH":
      return text.zh;
    case "ONLY_EN":
      return text.en;
    case "BILINGUAL_EN_FIRST":
      return text.zh === text.en ? text.en : `${text.en} (${text.zh})`;
    case "BILINGUAL_ZH_FIRST":
    default:
      return text.zh === text.en ? text.zh : `${text.zh} (${text.en})`;
  }
}

/**
 * Format service names dynamically:
 * e.g. "剪 (Hair Cut)" ->
 *   ONLY_ZH: "剪发"
 *   ONLY_EN: "Hair Cut"
 *   BILINGUAL_ZH_FIRST: primary="剪发", secondary="Hair Cut"
 *   BILINGUAL_EN_FIRST: primary="Hair Cut", secondary="剪发"
 */
export function resolveServiceName(
  rawName: string,
  mode: DeskLanguageMode = "BILINGUAL_ZH_FIRST"
): { primary: string; secondary?: string } {
  let zh = rawName;
  let en = rawName;

  if (rawName.includes("剪") || rawName.toLowerCase().includes("cut")) {
    zh = "剪发";
    en = "Hair Cut";
  } else if (rawName.includes("洗") || rawName.toLowerCase().includes("wash")) {
    zh = "洗吹";
    en = "Wash";
  } else if (rawName.includes("染") || rawName.toLowerCase().includes("color")) {
    zh = "染发";
    en = "Hair Color";
  } else {
    // Attempt parse "中文 (English)"
    const match = rawName.match(/^([^(]+)\s*\(([^)]+)\)$/);
    if (match) {
      zh = match[1].trim();
      en = match[2].trim();
    }
  }

  return resolveDeskText({ zh, en }, mode);
}

/**
 * Complete bilingual dictionary for the Salon Desk.
 */
export const DESK_DICT = {
  // Top Header
  header: {
    title: { zh: "前台收银", en: "Salon Desk" },
    deskMode: { zh: "柜台模式", en: "Desk Mode" },
    lock: { zh: "锁定", en: "Lock" },
    refresh: { zh: "刷新", en: "Refresh" },
    settings: { zh: "设置", en: "Settings" },
    currency: { zh: "结算货币", en: "Currency" },
    languageMode: { zh: "界面语言模式", en: "Display Language" },
    refreshDeskData: { zh: "刷新前台数据", en: "Refresh Desk Data" },
    adminSettings: { zh: "系统管理设置", en: "Admin Settings" },
  },

  // Hub Scoreboard
  scoreboard: {
    scoreboardTitle: { zh: "营业看板", en: "Scoreboard" },
    scoreboardSub: {
      zh: "今日、昨日及本月实时营业总额与完成单数",
      en: "Live sales revenue and completed order stats",
    },
    todaySales: { zh: "今日总营业额", en: "Today's Sales" },
    yesterdaySales: { zh: "昨日营业额", en: "Yesterday's Sales" },
    monthlySales: { zh: "本月总营业额", en: "Monthly Sales" },
    todayClients: { zh: "今日完成", en: "Today Served" },
    yesterdayClients: { zh: "昨日完成", en: "Yesterday Served" },
    monthlyClients: { zh: "本月累计", en: "Month Served" },
    completedClients: { zh: "已服务顾客", en: "Completed Clients" },
    waiting: { zh: "待服务预约", en: "Waiting Bookings" },
    servedBadge: { zh: "位完成", en: "Served" },
    bookedBadge: { zh: "位已预约", en: "Booked" },
    clientsUnit: { zh: "位", en: "clients" },
    ordersDone: { zh: "单完成", en: "orders" },
  },

  // Hub 2 Main Cards
  hubCards: {
    makeAppointmentTitle: { zh: "预约管理", en: "Make Appointment" },
    makeAppointmentSub: {
      zh: "查看今日预约清单、日历视图及新增预约",
      en: "View today's checklist & calendar, add new booking",
    },
    countSalesTitle: { zh: "收款开单", en: "Count Sales" },
    countSalesSub: {
      zh: "预约顾客结账、散客直接开单、多选项目自动核算",
      en: "Ring up appointment or walk-in, pick services & collect money",
    },
    startSaleBtn: { zh: "立即开单", en: "Start Sale" },
    appointmentsBadge: { zh: "预约管理", en: "Appointments" },
  },

  // Service Breakdown
  breakdown: {
    title: { zh: "今日服务销售明细", en: "Today's Service Breakdown" },
    subtitle: {
      zh: "实时统计今日各项已完成服务的开单数量与金额",
      en: "Live summary of services completed today",
    },
    servicesDoneBadge: { zh: "项服务已售", en: "Services Sold" },
    expandBtn: { zh: "展开明细", en: "View Details" },
    collapseBtn: { zh: "收起", en: "Collapse" },
    noSalesYet: { zh: "今日暂无服务开单记录", en: "No services sold yet today." },
    tapCountNotice: {
      zh: "点击上方“收款开单”为顾客记账",
      en: "Tap “Count Sales” above to record a customer.",
    },
    clientUnit: { zh: "位顾客", en: "Client" },
    clientsUnit: { zh: "位顾客", en: "Clients" },
    totalLabel: { zh: "合计", en: "Total" },
  },

  // Make Appointment View
  appointmentView: {
    backToMain: { zh: "返回主菜单", en: "Back to Main Menu" },
    appointmentsHeader: { zh: "今日预约清单", en: "Today's Schedule" },
    checklistTab: { zh: "📋 清单模式", en: "📋 Checklist" },
    calendarTab: { zh: "📅 日历模式", en: "📅 Calendar" },
    addAppointmentBtn: { zh: "+ 新增预约", en: "+ Add Appointment" },
    noAppointmentsTitle: {
      zh: "该日期暂无预约",
      en: "No appointments scheduled for this date.",
    },
    noAppointmentsSub: {
      zh: "点击右上方“+ 新增预约”为客户登记时间",
      en: "Tap '+ Add Appointment' above to register a booking.",
    },
    feeLabel: { zh: "费用", en: "Fee" },
    depositPaidLabel: { zh: "已付定金", en: "Deposit Paid" },
    markDoneBtn: { zh: "✓ 完成", en: "✓ Done" },
    ringUpBtn: { zh: "💰 去结账", en: "💰 Ring Up" },
    modalTitle: { zh: "登记新预约", en: "Add New Appointment" },
    customerName: { zh: "顾客姓名", en: "Customer Name" },
    phoneNumber: { zh: "电话号码", en: "Phone Number" },
    service: { zh: "服务项目", en: "Service" },
    date: { zh: "日期", en: "Date" },
    time: { zh: "时间", en: "Time" },
    notes: { zh: "备注 (选填)", en: "Notes (Optional)" },
    cancel: { zh: "取消", en: "Cancel" },
    confirmBooking: { zh: "确认添加预约", en: "Confirm Appointment" },
    savingBooking: { zh: "正在保存预约…", en: "Saving…" },
  },

  // Count Sales View
  countSalesView: {
    cancelBack: { zh: "取消 / 返回主菜单", en: "Cancel / Back" },
    step1Client: { zh: "1. 结算对象", en: "1. Select Client" },
    walkinTab: { zh: "🚶 散客", en: "🚶 Walk-in" },
    appointmentTab: { zh: "📅 预约顾客结账", en: "📅 Appointment" },
    walkinDefault: { zh: "散客", en: "Walk-in" },
    walkinFastNotice: {
      zh: "快速散客模式 — 无需输入资料，3秒直接选项目开单",
      en: "Fast walk-in mode — ring up in 3 seconds without typing",
    },
    recordCustomerDetailsBtn: {
      zh: "+ 记录顾客姓名 / 电话 (选填)",
      en: "+ Record Customer Name / Phone (Optional)",
    },
    hideCustomerDetailsBtn: {
      zh: "− 隐藏顾客信息",
      en: "− Hide Customer Details",
    },
    customerNamePlaceholder: { zh: "顾客称呼 (如：王小姐)", en: "Customer Name (e.g. Sarah)" },
    customerPhonePlaceholder: { zh: "电话号码 (选填)", en: "Phone Number (Optional)" },
    step2Services: { zh: "2. 选择服务 (可多选)", en: "2. Select Services (Multiple)" },
    step3Payment: { zh: "3. 付款方式", en: "3. Payment Method" },
    customerDetailsOptional: {
      zh: "顾客信息 (选填)",
      en: "Customer Details (Optional)",
    },
    pmCash: { zh: "现金", en: "Cash" },
    pmTransfer: { zh: "转账", en: "Transfer" },
    pmTransferDuitnow: { zh: "转账", en: "DuitNow QR" },
    pmTransferPayid: { zh: "转账", en: "PayID / QR" },
    pmCard: { zh: "刷卡", en: "Card" },
    pmCardEftpos: { zh: "刷卡", en: "Card / EFTPOS" },
    totalToCollect: { zh: "应收总额", en: "Total to Collect" },
    confirmSaleBtn: { zh: "确认开单", en: "Review & Confirm Sale" },
    selectScheduledClient: {
      zh: "选择今日已预约的顾客：",
      en: "Select Scheduled Client:",
    },
    itemsSelected: { zh: "项已选", en: "Selected" },
    noPendingAppointmentsWalkinNotice: {
      zh: "今天暂无等待中的预约，请选择散客开单。",
      en: "No pending appointments today. Please select Walk-in.",
    },
    noPendingAppointmentsNotice: {
      zh: "今天暂无等待中的预约。",
      en: "No pending appointments today.",
    },

    // Receipt Modal
    confirmModalTitle: { zh: "确认保存这笔销售记录？", en: "Confirm Record Sale?" },
    confirmModalDesc: {
      zh: "请核对以下开单明细：",
      en: "Please double check the details before saving:",
    },
    modalCustomer: { zh: "顾客", en: "Customer" },
    modalPaymentMethod: { zh: "付款方式", en: "Payment Method" },
    modalServices: { zh: "服务项目", en: "Services" },
    modalDepositDeduction: { zh: "已付定金抵扣", en: "Deposit Already Paid" },
    modalAmountCollected: { zh: "实收总额", en: "Amount Collected" },
    modalConfirmBtn: { zh: "确认并记账", en: "Confirm & Save" },
    modalSavingBtn: { zh: "正在保存…", en: "Saving…" },
    modalCancelBtn: { zh: "返回修改", en: "Back / Edit" },
  },

  // Monthly Financial & Profit Report Module
  financialReport: {
    navBtn: { zh: "📊 财务月报", en: "📊 Monthly Report" },
    title: { zh: "月度财报与净利润", en: "Monthly Financial & Net Profit" },
    subtitle: {
      zh: "核算每月营业额、进货成本、日常开支及纯利润",
      en: "Track monthly revenue, stock purchases, expenses, and net profit",
    },
    backToDesk: { zh: "返回前台", en: "Back to Desk" },
    logExpenseBtn: { zh: "批量录入开销", en: "Log Expenses" },
    thisMonthBtn: { zh: "本月", en: "This Month" },
    kpiGrossSales: { zh: "营业总额", en: "Gross Revenue" },
    kpiOrdersCount: { zh: "完成开单", en: "Orders" },
    kpiTotalExpenses: { zh: "进货与开支", en: "Stock & Expenses" },
    kpiExpenseCount: { zh: "开销", en: "Entries" },
    kpiNetProfit: { zh: "净利润", en: "Net Profit" },
    kpiMargin: { zh: "净利润率", en: "Profit Margin" },
    tabExpenses: { zh: "开销", en: "Expense Records" },
    tabSales: { zh: "服务营业额", en: "Service Sales" },
    tabDaily: { zh: "每日收支", en: "Daily Breakdown" },
    modalLogExpenseTitle: { zh: "开销记录", en: "Expense Entry" },
    modalLogExpenseSub: {
      zh: "可同时在多个分类中输入金额，点击下方按钮一键全部保存：",
      en: "Enter amounts for multiple categories at once and save together in one click:",
    },
    expenseTitleLabel: { zh: "开销品名 / 说明", en: "Description / Item" },
    expenseTitlePlaceholder: {
      zh: "如：欧莱雅染膏 10 盒 / 洗发水进货 / 店铺房租",
      en: "e.g. L'Oreal dye 10 boxes / Rent / Restock",
    },
    expenseCategoryLabel: { zh: "开销分类", en: "Category" },
    expenseAmountLabel: { zh: "开销金额", en: "Amount" },
    expenseDateLabel: { zh: "发生日期", en: "Date" },
    expenseNotesLabel: { zh: "备注 (选填)", en: "Notes (Optional)" },
    btnSaveExpense: { zh: "保存开销记录", en: "Save Expense" },
    btnSavingExpense: { zh: "正在保存…", en: "Saving…" },
    saveAndAddNext: { zh: "+ 保存并记下一笔", en: "+ Save & Add Next" },
    saveAndClose: { zh: "✓ 完成并关闭", en: "✓ Done & Close" },
    fastModeTab: { zh: "连续快捷录入", en: "Fast Stream" },
    batchModeTab: { zh: "批量多行添加", en: "Batch Multi-Row" },
    addRowBtn: { zh: "+ 添加一行", en: "+ Add Row" },
    saveAllBatchBtn: { zh: "一键保存全部", en: "Save All" },
    titleRequiredNotice: {
      zh: "选择“其他杂费”时请输入具体说明",
      en: "Description required for Other Expense",
    },
    titleOptionalNotice: {
      zh: "选填，留空默认记录为分类名",
      en: "Optional (defaults to category name)",
    },
    sessionAddedTitle: { zh: "本次已录入", en: "Added this session" },
    noExpensesYet: { zh: "本月暂无开销记录，点击下方按钮添加", en: "No expenses recorded this month yet." },
    noSalesYet: { zh: "本月暂无已完成的开单收款", en: "No sales recorded this month yet." },
    pinModalTitle: { zh: "老板安全密码验证", en: "Owner PIN Verification" },
    pinModalSubtitle: {
      zh: "请输入 4 位数字密码解锁查看店铺利润与开销数据",
      en: "Enter 4-digit PIN to access financial & profit reports",
    },
    pinModalUnlockBtn: { zh: "解锁月报", en: "Unlock Report" },
    pinError: { zh: "密码错误，请重新输入", en: "Incorrect PIN code" },
    categoryStock: { zh: "进货库存", en: "Stock / Supplies" },
    categoryRent: { zh: "店面租金", en: "Shop Rent" },
    categoryUtilities: { zh: "水电杂费", en: "Utilities" },
    categorySalary: { zh: "员工薪资/提成", en: "Salary / Commission" },
    categoryMarketing: { zh: "推广广告", en: "Marketing" },
    categoryOther: { zh: "其他杂费", en: "Other Misc" },
    enterAmountsHint: {
      zh: "在上方任意分类中输入金额即可同时录入",
      en: "Enter amounts in any categories above to log together",
    },
    itemsFilledPrefix: { zh: "已填写", en: "filled" },
    itemsFilledUnit: { zh: "项开销：", en: "expense item(s) filled:" },
    descRequiredNotice: { zh: "* 填金额须写说明", en: "* Description required" },
    descOptionalNotice: { zh: "选填说明 (可选)", en: "Optional description" },
    otherDescPlaceholder: {
      zh: "具体杂费用途说明 (如: 维修水管)",
      en: "Specific description (e.g. Plumbing repair)",
    },
    customRowLabel: { zh: "额外开销行", en: "Custom Expense" },
    removeRow: { zh: "删除行", en: "Remove row" },
    amountPlaceholder: { zh: "金额 (0.00)", en: "Amount (0.00)" },
    descPlaceholder: { zh: "说明 / 备注 (选填)", en: "Description / Notes (Optional)" },
    addCustomRowBtn: { zh: "+ 添加更多自定义行", en: "+ Add extra custom row" },
    confirmDelete: {
      zh: "确定要删除这条开销记录吗？",
      en: "Are you sure you want to delete this expense record?",
    },
    deleteRecord: { zh: "删除记录", en: "Delete expense" },
    enterAtLeastOne: {
      zh: "请在任意开销分类中输入至少一笔金额",
      en: "Please enter at least one expense amount.",
    },
    otherRequiresDesc: {
      zh: "填写“其他杂费”时必须输入具体说明",
      en: "Please enter description for Other Misc expense.",
    },
    profitTag: { zh: "✓ 盈利", en: "✓ Profit" },
    lossTag: { zh: "⚠ 亏损", en: "⚠ Loss" },
    revenueMinusExpenses: { zh: "营业额 − 开销", en: "Sales − Expenses" },
    costOutflow: { zh: "进货/杂支", en: "Cost Outflow" },
    categoriesCountUnit: { zh: "类开销", en: "Categories" },
    incomePercent: { zh: "收入", en: "Income" },
    dateHeader: { zh: "日期", en: "Date" },
    ordersHeader: { zh: "开单数", en: "Orders" },
    salesHeader: { zh: "当日营业额", en: "Sales" },
    expensesHeader: { zh: "当日开销", en: "Expenses" },
    netProfitHeader: { zh: "净收益", en: "Net Profit" },
    noDailyRecords: {
      zh: "本月暂无每日收支明细",
      en: "No daily records for this month yet",
    },
    multiExpenseSub: {
      zh: "同时输入多项开销，系统自动核算营业额与纯利润",
      en: "Enter multiple expenses at once to calculate net profit",
    },
    notesDefaultPrefix: { zh: "备注 (选填，留空默认“", en: "Notes (optional, defaults to \"" },
    notesDefaultSuffix: { zh: "”)", en: "\")" },
    saveAllWithCountPrefix: { zh: "✓ 一键保存全部 (", en: "✓ Save All (" },
    saveAllWithCountSuffix: { zh: " 笔)", en: " items)" },
    enterAmountFirst: { zh: "请先输入金额", en: "Enter amount first" },
    expenseAllocation: { zh: "开销分类占比", en: "Expense Allocation" },
  },

  // Database Backup & Export
  backup: {
    title: { zh: "数据库备份与导出", en: "Database Backup & Export" },
    subtitle: {
      zh: "一键导出完整 SQL 备份或按月下载 Excel/CSV 销售账单",
      en: "Export full SQL database dump or monthly CSV sales spreadsheet",
    },
    downloadSqlBtn: {
      zh: "💾 立即下载完整数据库备份 (.sql)",
      en: "💾 Download Full Database Backup (.sql)",
    },
    downloadingSql: { zh: "正在生成备份文件...", en: "Generating backup..." },
    sqlHelpText: {
      zh: "包含所有顾客、开单销售、明细项目、开销支出及系统设置。可在 Supabase 或任意 PostgreSQL 数据库直接运行恢复。",
      en: "Includes all customers, sales, booking items, expenses, and settings. Can be directly restored in Supabase or any PostgreSQL database.",
    },
    exportMonthCsvBtn: { zh: "📥 导出本月销售明细 (CSV)", en: "📥 Export Monthly Sales (CSV)" },
    exportAllCsvBtn: { zh: "📥 导出全部历史销售 (CSV)", en: "📥 Export All-Time Sales (CSV)" },
    exportSalesShort: { zh: "导出账单", en: "Export CSV" },
    exportingCsv: { zh: "正在下载本月销售账单 (CSV)...", en: "Downloading monthly sales CSV..." },
    tablesIncluded: { zh: "包含数据表", en: "Tables Included" },
    recordsCount: { zh: "总记录数", en: "Total Records" },
    automatedBackupNote: {
      zh: "GitHub Actions 每日自动备份已配置",
      en: "Daily automated GitHub Actions backup configured",
    },
    exportBtn: { zh: "导出与备份", en: "Export & Backup" },
    exportDesc: { zh: "下载本月销售账单或完整数据库", en: "Download monthly sales or full database" },
  },

  // Monthly Bank Statement Report Module
  statement: {
    title: { zh: "月度营业对账单", en: "Monthly Business Statement" },
    subtitle: {
      zh: "标准银行月结单格式，支持一键打印/导出 A4 PDF 与核对账目",
      en: "Bank-standard monthly statement, print/export A4 PDF or Excel",
    },
    statementNo: { zh: "对账单号", en: "Statement Ref" },
    period: { zh: "账单周期", en: "Statement Period" },
    issueDate: { zh: "生成时间", en: "Issue Date" },
    currency: { zh: "结算币种", en: "Currency" },
    printPdfBtn: { zh: "🖨️ 打印 / 另存为 PDF", en: "🖨️ Print / Save as PDF" },
    exportCsvBtn: { zh: "📥 导出 Excel / CSV", en: "📥 Export Excel / CSV" },
    backBtn: { zh: "返回", en: "Back" },
    includeExpenses: { zh: "包含店铺开销与纯利润", en: "Include Expenses & Net Profit" },
    excludeExpenses: { zh: "仅销售交易明细", en: "Sales Only" },
    expensesToggleNotice: {
      zh: "可按需勾选是否在对账单中包含租金、进货、水电等杂项开支与净利润核算",
      en: "Toggle whether to include shop rent, stock, utilities expenses and net profit",
    },
    grossSales: { zh: "营业总额", en: "Gross Sales" },
    totalClients: { zh: "服务人次", en: "Clients Served" },
    avgTicket: { zh: "平均客单价", en: "Avg. Ticket" },
    totalExpenses: { zh: "店铺总开销", en: "Total Expenses" },
    netProfit: { zh: "纯利润", en: "Net Profit" },
    profitMargin: { zh: "利润率", en: "Profit Margin" },
    paymentChannels: { zh: "收款方式统计", en: "Payment Channels" },
    topServices: { zh: "主要服务项目统计", en: "Top Services Breakdown" },
    transactionLedger: { zh: "销售交易明细清单", en: "Transaction Ledger" },
    colDate: { zh: "日期时间", en: "Date & Time" },
    colRef: { zh: "单号", en: "Ref Code" },
    colClient: { zh: "顾客", en: "Client" },
    colType: { zh: "类型", en: "Type" },
    colServices: { zh: "服务项目", en: "Services" },
    colMethod: { zh: "方式", en: "Method" },
    colAmount: { zh: "金额", en: "Amount" },
    noTransactions: { zh: "该月份暂无已完成交易记录", en: "No completed transactions for this month" },
    footerDisclaimer: {
      zh: "机密文件 · 本对账单仅供店铺内部核账、税务合规与财务审计使用 · 由沙龙系统自动生成",
      en: "CONFIDENTIAL · FOR INTERNAL BUSINESS, TAX COMPLIANCE & ACCOUNTING USE ONLY · AUTOMATICALLY GENERATED",
    },
    statementActionBtn: { zh: "📄 月度对账单", en: "📄 Monthly Statement" },
    viewStatement: { zh: "查看完整对账单", en: "View Statement" },
  },
} as const;
