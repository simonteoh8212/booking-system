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
  },

  // Hub Scoreboard
  scoreboard: {
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
  },

  // Service Breakdown
  breakdown: {
    title: { zh: "各项服务业绩", en: "Today's Sales by Service" },
    servicesDoneBadge: { zh: "项服务完成", en: "Services Done" },
    noSalesYet: { zh: "今日暂无服务开单记录", en: "No services sold yet today." },
    tapCountNotice: {
      zh: "点击上方“收款开单”为顾客记账",
      en: "Tap “Count Sales” above to record a customer.",
    },
    clientUnit: { zh: "位顾客", en: "Client" },
    clientsUnit: { zh: "位顾客", en: "Clients" },
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
    walkinTab: { zh: "🚶 散客直接开单", en: "🚶 Walk-in Customer" },
    appointmentTab: { zh: "📅 预约顾客结账", en: "📅 From Appointment" },
    walkinDefault: { zh: "散客", en: "Walk-in Customer" },
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
    step2Services: { zh: "2. 选择服务项目 (可多选)", en: "2. Select Services (Multiple)" },
    step3Payment: { zh: "3. 付款方式", en: "3. Payment Method" },
    pmCash: { zh: "现金", en: "Cash" },
    pmTransfer: { zh: "转账", en: "Transfer" },
    pmCard: { zh: "刷卡", en: "Card" },
    totalToCollect: { zh: "应收总额", en: "Total to Collect" },
    confirmSaleBtn: { zh: "确认开单收款", en: "Review & Confirm Sale" },

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
    backToDesk: { zh: "返回收银前台", en: "Back to Desk" },
    logExpenseBtn: { zh: "批量录入支出", en: "Log Expenses" },
    thisMonthBtn: { zh: "本月", en: "This Month" },
    kpiGrossSales: { zh: "营业总额", en: "Gross Revenue" },
    kpiOrdersCount: { zh: "完成开单", en: "Orders" },
    kpiTotalExpenses: { zh: "进货与开支", en: "Stock & Expenses" },
    kpiExpenseCount: { zh: "支出笔数", en: "Entries" },
    kpiNetProfit: { zh: "当月净利润", en: "Net Profit" },
    kpiMargin: { zh: "净利润率", en: "Profit Margin" },
    tabExpenses: { zh: "支出与进货明细", en: "Expense Records" },
    tabSales: { zh: "服务项目营业额", en: "Service Sales" },
    tabDaily: { zh: "每日收支明细", en: "Daily Breakdown" },
    modalLogExpenseTitle: { zh: "多项支出一键录入", en: "Multi-Category Expense Entry" },
    modalLogExpenseSub: {
      zh: "可同时在多个分类中输入金额，点击下方按钮一键全部保存：",
      en: "Enter amounts for multiple categories at once and save together in one click:",
    },
    expenseTitleLabel: { zh: "支出品名 / 说明", en: "Description / Item" },
    expenseTitlePlaceholder: {
      zh: "如：欧莱雅染膏 10 盒 / 洗发水进货 / 店铺房租",
      en: "e.g. L'Oreal dye 10 boxes / Rent / Restock",
    },
    expenseCategoryLabel: { zh: "支出分类", en: "Category" },
    expenseAmountLabel: { zh: "支出金额", en: "Amount" },
    expenseDateLabel: { zh: "发生日期", en: "Date" },
    expenseNotesLabel: { zh: "备注 (选填)", en: "Notes (Optional)" },
    btnSaveExpense: { zh: "保存支出记录", en: "Save Expense" },
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
    noExpensesYet: { zh: "本月暂无支出记录，点击下方按钮添加", en: "No expenses recorded this month yet." },
    noSalesYet: { zh: "本月暂无已完成的开单收款", en: "No sales recorded this month yet." },
    pinModalTitle: { zh: "老板安全密码验证", en: "Owner PIN Verification" },
    pinModalSubtitle: {
      zh: "请输入 4 位数字密码解锁查看店铺利润与支出数据",
      en: "Enter 4-digit PIN to access financial & profit reports",
    },
    pinModalUnlockBtn: { zh: "解锁月报", en: "Unlock Report" },
    pinError: { zh: "密码错误，请重新输入", en: "Incorrect PIN code" },
    categoryStock: { zh: "进货库存", en: "Stock / Supplies" },
    categoryRent: { zh: "店面租金", en: "Shop Rent" },
    categoryUtilities: { zh: "水电杂费", en: "Utilities" },
    categorySalary: { zh: "员工薪资/提成", en: "Salary / Commission" },
    categoryOther: { zh: "其他杂费", en: "Other Misc" },
  },
} as const;
