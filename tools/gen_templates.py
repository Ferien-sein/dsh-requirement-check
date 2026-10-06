# -*- coding: utf-8 -*-
"""生成 templates.js（三语 + 8 套模板）。

为什么用脚本生成：三语 × 8 套 × 每套 8 个字段 = 192 条文案，
手写容易漏字段、错位。这里用结构化数据一次写全，再渲染成 JS。

输出位置：从脚本自身位置推算（<仓库>/src/templates.js），
不写死本机绝对路径 —— 否则别人克隆下来一跑就把文件写到作者机器上，
而且会把作者的用户名和目录结构暴露进公开仓库。
"""
import io
import json
import os

# 每套模板：id + 三语的 name/scene + 8 个字段（三语）
# 字段顺序固定，保证三语一一对应。
T = []


def add(tid, names, scenes, fields):
    """fields: [(key_zhCN, {locale: text}, ...)] 以 dict 形式给全"""
    assert len(fields) == 8, f"{tid} 字段数 {len(fields)} != 8"
    T.append({"id": tid, "name": names, "scene": scenes, "fields": fields})


# ---------------------------------------------------------------- 1 通用：Excel 汇总
add(
    "excel-merge",
    {"zh-CN": "Excel 多表汇总", "zh-TW": "Excel 多表彙總", "en": "Merge multiple Excel files"},
    {"zh-CN": "每天/每周把几个表合成一个总表，还要核对数字对不对",
     "zh-TW": "每天／每週把幾個表合成一份總表，還要核對數字對不對",
     "en": "Combine several spreadsheets into one master sheet, and check the numbers add up"},
    [
        ("要做什么", {
            "zh-CN": "把每天从系统导出的 3 个销售表自动合并成一张汇总表，并标出金额对不上的行",
            "zh-TW": "把每天從系統匯出的 3 個銷售表自動合併成一張彙總表，並標出金額對不上的列",
            "en": "Automatically merge the 3 sales spreadsheets exported from our system each day into one summary, and flag rows whose amounts do not match"}),
        ("现在怎么做", {
            "zh-CN": "手动复制粘贴到一个总表，再一个个核对客户名，约 40 分钟，容易漏行抄错",
            "zh-TW": "手動複製貼上到一份總表，再一筆筆核對客戶名稱，約 40 分鐘，容易漏列抄錯",
            "en": "I copy and paste into a master sheet by hand, then check customer names one by one; about 40 minutes, and rows get missed or mistyped"}),
        ("输入", {
            "zh-CN": "每天 3 个 .xlsx 放在「每日数据」文件夹；第一行是标题；列有 日期/客户/金额；约 200 行",
            "zh-TW": "每天 3 個 .xlsx 放在「每日資料」資料夾；第一列是標題；欄位有 日期／客戶／金額；約 200 列",
            "en": "3 .xlsx files per day in a 'daily-data' folder; first row is headers; columns are date / customer / amount; about 200 rows"}),
        ("输出", {
            "zh-CN": "屏幕显示总金额与异常行数；导出 Excel 到桌面，文件名 汇总_当天日期.xlsx",
            "zh-TW": "螢幕顯示總金額與異常列數；匯出 Excel 到桌面，檔名 彙總_當天日期.xlsx",
            "en": "Show the total amount and the number of problem rows on screen; export an Excel file to the desktop named summary_<date>.xlsx"}),
        ("怎么算做好了", {
            "zh-CN": "拿上周的 3 个文件跑一遍，总金额和财务给的数字完全一致，异常行全部标出",
            "zh-TW": "拿上週的 3 個檔案跑一遍，總金額和財務給的數字完全一致，異常列全部標出",
            "en": "Run it on last week's 3 files: the total matches finance's number exactly, and every problem row is flagged"}),
        ("出错怎么办", {
            "zh-CN": "客户名对不上时不要静默跳过，把那几行单独列出来提醒我",
            "zh-TW": "客戶名稱對不上時不要默默跳過，把那幾列單獨列出來提醒我",
            "en": "If a customer name cannot be matched, do not skip it silently — list those rows separately and warn me"}),
        ("不做什么", {
            "zh-CN": "这一版不做图表、不做多用户、不联网",
            "zh-TW": "這一版不做圖表、不做多使用者、不連線",
            "en": "This version does not do charts, multi-user, or networking"}),
        ("给谁用", {
            "zh-CN": "只有我自己用，一台 Windows 电脑",
            "zh-TW": "只有我自己用，一台 Windows 電腦",
            "en": "Only me, on one Windows PC"}),
    ],
)

# ---------------------------------------------------------------- 2 通用：批量文档
add(
    "report-generate",
    {"zh-CN": "批量生成文档", "zh-TW": "批次產生文件", "en": "Batch-generate documents"},
    {"zh-CN": "有一堆数据，要按固定格式生成 Word/PDF/图片发出去",
     "zh-TW": "有一堆資料，要依固定格式產生 Word／PDF／圖片寄出去",
     "en": "Take a batch of data and generate Word/PDF/images in a fixed format to send out"},
    [
        ("要做什么", {
            "zh-CN": "根据一张清单表，批量生成合同（或报价单、通知）Word 文档",
            "zh-TW": "依一份清單表，批次產生合約（或報價單、通知）Word 文件",
            "en": "Generate Word contracts (or quotes, notices) in bulk from one list spreadsheet"}),
        ("现在怎么做", {
            "zh-CN": "一个个复制模板、改名字改金额另存，一次十几份，改到眼花",
            "zh-TW": "一份份複製範本、改名稱改金額另存，一次十幾份，改到眼花",
            "en": "I copy the template, edit the name and amount, save as a new file — a dozen times, and my eyes glaze over"}),
        ("输入", {
            "zh-CN": "一个 .xlsx 清单，列有 客户名/金额/日期/地址；大约 20~50 行",
            "zh-TW": "一個 .xlsx 清單，欄位有 客戶名稱／金額／日期／地址；大約 20~50 列",
            "en": "One .xlsx list with columns customer / amount / date / address; about 20-50 rows"}),
        ("输出", {
            "zh-CN": "每行生成一份 .docx，文件名 = 客户名_日期.docx，统一放到「生成结果」文件夹",
            "zh-TW": "每一列產生一份 .docx，檔名 = 客戶名稱_日期.docx，統一放到「產生結果」資料夾",
            "en": "One .docx per row, named customer_date.docx, all placed in a 'generated' folder"}),
        ("怎么算做好了", {
            "zh-CN": "生成的文件数量和清单行数一致，随机抽查 3 份内容和清单完全对得上",
            "zh-TW": "產生的檔案數量和清單列數一致，隨機抽查 3 份內容和清單完全相符",
            "en": "The number of files equals the number of rows; spot-checking 3 of them shows the content matches the list exactly"}),
        ("出错怎么办", {
            "zh-CN": "客户名含特殊字符（/ \\ : * ?）时自动替换成下划线，不要报错中断",
            "zh-TW": "客戶名稱含特殊字元（/ \\ : * ?）時自動換成底線，不要報錯中斷",
            "en": "If a customer name contains / \\ : * ? replace them with underscores automatically; do not abort with an error"}),
        ("不做什么", {
            "zh-CN": "不做在线签署、不发邮件，只生成文件",
            "zh-TW": "不做線上簽署、不寄郵件，只產生檔案",
            "en": "No online signing and no emails — just generate the files"}),
        ("给谁用", {
            "zh-CN": "我和 1 个同事用",
            "zh-TW": "我和 1 位同事用",
            "en": "Me and one colleague"}),
    ],
)

# ---------------------------------------------------------------- 3 通用：对账
add(
    "reconcile",
    {"zh-CN": "两个表对账", "zh-TW": "兩份表對帳", "en": "Reconcile two data sets"},
    {"zh-CN": "两份数据要找出不一致的地方",
     "zh-TW": "兩份資料要找出不一致的地方",
     "en": "Find where two data sets disagree"},
    [
        ("要做什么", {
            "zh-CN": "把系统导出的流水和银行流水对比，找出金额对不上的记录",
            "zh-TW": "把系統匯出的流水和銀行流水比對，找出金額對不上的紀錄",
            "en": "Compare the system's transaction export against the bank statement and find records whose amounts disagree"}),
        ("现在怎么做", {
            "zh-CN": "用 Excel 排序后人工一行行看，几百行看半天，还看不全",
            "zh-TW": "用 Excel 排序後人工一列列看，幾百列看半天，還看不全",
            "en": "I sort in Excel and read row by row; hundreds of rows take half a day and I still miss things"}),
        ("输入", {
            "zh-CN": "两个 .xlsx：系统流水、银行流水；列有 日期/单号/金额；各约 500 行",
            "zh-TW": "兩個 .xlsx：系統流水、銀行流水；欄位有 日期／單號／金額；各約 500 列",
            "en": "Two .xlsx files — system ledger and bank statement — with columns date / reference / amount; about 500 rows each"}),
        ("输出", {
            "zh-CN": "屏幕显示「只在一方出现」「金额不一致」两类清单；导出 Excel 到桌面",
            "zh-TW": "螢幕顯示「只出現在一邊」「金額不一致」兩類清單；匯出 Excel 到桌面",
            "en": "Show two lists on screen — 'only on one side' and 'amount mismatch' — and export an Excel file to the desktop"}),
        ("怎么算做好了", {
            "zh-CN": "拿上月数据跑一遍，人工核对的差异条数和程序找出的完全一致",
            "zh-TW": "拿上月資料跑一遍，人工核對的差異筆數和程式找出的完全一致",
            "en": "Run it on last month's data: the number of discrepancies found matches what a manual check produced"}),
        ("出错怎么办", {
            "zh-CN": "金额列有空值时按 0 处理并单独标记，不要跳过整行",
            "zh-TW": "金額欄有空值時以 0 處理並單獨標記，不要跳過整列",
            "en": "Treat blank amounts as 0 and flag them separately; do not skip the whole row"}),
        ("不做什么", {
            "zh-CN": "不做自动调账，只做比对和提示",
            "zh-TW": "不做自動調帳，只做比對和提示",
            "en": "No automatic adjustments — only comparison and warnings"}),
        ("给谁用", {
            "zh-CN": "只有我自己用；数据不能上传到网上",
            "zh-TW": "只有我自己用；資料不能上傳到網路上",
            "en": "Only me; the data must not be uploaded anywhere"}),
    ],
)

# ---------------------------------------------------------------- 4 通用：文件整理
add(
    "file-rename",
    {"zh-CN": "文件批量整理", "zh-TW": "檔案批次整理", "en": "Batch-organize files"},
    {"zh-CN": "一堆文件名很乱，要按规则改名/分类/归档",
     "zh-TW": "一堆檔案名稱很亂，要依規則改名／分類／歸檔",
     "en": "A pile of badly named files that need renaming, sorting, or archiving by rule"},
    [
        ("要做什么", {
            "zh-CN": "把「下载」文件夹里的文件按类型和日期自动改名归类到子文件夹",
            "zh-TW": "把「下載」資料夾裡的檔案依類型和日期自動改名歸類到子資料夾",
            "en": "Rename files in the Downloads folder by type and date and sort them into subfolders"}),
        ("现在怎么做", {
            "zh-CN": "手动一个个改，几十个文件改到手酸，还容易重名",
            "zh-TW": "手動一個個改，幾十個檔案改到手痠，還容易撞名",
            "en": "I rename them one by one; dozens of files wear out my hands and names collide"}),
        ("输入", {
            "zh-CN": "一个文件夹里的各种文件，文件名没什么规律，约 100~500 个",
            "zh-TW": "一個資料夾裡的各種檔案，檔名沒什麼規律，約 100~500 個",
            "en": "Assorted files in one folder, names are irregular, about 100-500 files"}),
        ("输出", {
            "zh-CN": "按 类型/年月 建子文件夹并移动文件；屏幕上给出改动清单（原名→新名）",
            "zh-TW": "依 類型／年月 建立子資料夾並移動檔案；螢幕上給出異動清單（原名→新名）",
            "en": "Create subfolders by type/year-month and move files in; show a change list on screen (old name → new name)"}),
        ("怎么算做好了", {
            "zh-CN": "拿一个测试文件夹跑一遍，文件一个没丢，重名自动加了序号",
            "zh-TW": "拿一個測試資料夾跑一遍，檔案一個都沒少，撞名自動加上序號",
            "en": "Run it on a test folder: nothing is lost, and any name collision gets a numeric suffix"}),
        ("出错怎么办", {
            "zh-CN": "重名时自动追加序号；不确定类型的文件留在原地并列出，不要乱移",
            "zh-TW": "撞名時自動加上序號；類型不確定的檔案留在原地並列出，不要亂移",
            "en": "On collision append a number; leave unrecognized types where they are and list them rather than guessing"}),
        ("不做什么", {
            "zh-CN": "不删除任何文件；不确定的一律不动",
            "zh-TW": "不刪除任何檔案；不確定的一律不動",
            "en": "Never delete anything; when unsure, do nothing"}),
        ("给谁用", {
            "zh-CN": "只有我自己用",
            "zh-TW": "只有我自己用",
            "en": "Only me"}),
    ],
)

# ---------------------------------------------------------------- 5 行业：装修报价
add(
    "decoration-quote",
    {"zh-CN": "装修报价计算", "zh-TW": "裝修報價計算", "en": "Renovation quoting"},
    {"zh-CN": "按房间面积、材料、人工算报价，出一张能给客户看的单子",
     "zh-TW": "依房間面積、材料、工資算報價，出一張能給客戶看的單子",
     "en": "Quote from room area, materials, and labour, and produce a sheet the customer can read"},
    [
        ("要做什么", {
            "zh-CN": "一个算装修报价的小工具：输入各房间面积和做法，自动按材料单价和人工费算总价，并生成一张报价单",
            "zh-TW": "一個算裝修報價的小工具：輸入各房間面積和做法，自動依材料單價和工資算總價，並產生一張報價單",
            "en": "A small renovation quoting tool: enter each room's area and finish type, and it computes totals from material unit prices and labour rates, then produces a quotation sheet"}),
        ("现在怎么做", {
            "zh-CN": "用计算器按半天，材料项多的时候容易漏项；不同客户的口头改价经常记混",
            "zh-TW": "用計算機按半天，材料項目多的時候容易漏項；不同客戶的口頭改價常常記混",
            "en": "I punch numbers into a calculator for ages, miss line items when there are many, and mix up verbal price changes between customers"}),
        ("输入", {
            "zh-CN": "手动输入：项目名、房间（可增删）、每间的面积和做法、材料单价、人工单价、管理费比例、折扣",
            "zh-TW": "手動輸入：專案名稱、房間（可增減）、每間的面積和做法、材料單價、工資單價、管理費比例、折扣",
            "en": "Typed input: project name, rooms (add/remove), each room's area and finish, material unit price, labour rate, overhead percentage, discount"}),
        ("输出", {
            "zh-CN": "屏幕显示分项明细、小计、管理费、折扣、总计；可导出一张报价单（Excel 或图片）发给客户，图片要能直接在微信里发",
            "zh-TW": "螢幕顯示分項明細、小計、管理費、折扣、總計；可匯出一張報價單（Excel 或圖片）發給客戶，圖片要能直接在 LINE／微信裡傳",
            "en": "Show line items, subtotals, overhead, discount, and grand total; export a quotation (Excel or image) to send the customer, and the image must be shareable in a chat app"}),
        ("怎么算做好了", {
            "zh-CN": "拿 3 个已经做完的老项目试算，总计和我当时手工核对的金额一分不差；客户拿到的报价单不用我再改格式",
            "zh-TW": "拿 3 個已經做完的舊專案試算，總計和我當時手工核對的金額一毛不差；客戶拿到的報價單不用我再改格式",
            "en": "Try it on 3 completed past projects: totals match what I manually verified to the cent, and the customer's sheet needs no reformatting from me"}),
        ("出错怎么办", {
            "zh-CN": "有材料项没填单价时标红并提示我，不要按 0 算进去；面积填了非数字要拦住",
            "zh-TW": "有材料項目沒填單價時標紅並提醒我，不要以 0 計入；面積填了非數字要擋下來",
            "en": "If a line item has no unit price, highlight it and warn me — do not count it as 0; block non-numeric area input"}),
        ("不做什么", {
            "zh-CN": "不做客户管理、不做在线下单、不接施工进度；这一版就是算钱和出单子",
            "zh-TW": "不做客戶管理、不做線上訂單、不接施工進度；這一版就是算錢和出單子",
            "en": "No customer management, no online ordering, no construction scheduling — this version just prices and produces the sheet"}),
        ("给谁用", {
            "zh-CN": "我和店里 2 个同事用，Windows 电脑；客户资料不能上传",
            "zh-TW": "我和店裡 2 位同事用，Windows 電腦；客戶資料不能上傳",
            "en": "Me and two colleagues at the shop, on Windows; customer data must not leave the machine"}),
    ],
)

# ---------------------------------------------------------------- 6 行业：工资加班计算
add(
    "payroll-overtime",
    {"zh-CN": "工资与加班计算", "zh-TW": "薪資與加班計算", "en": "Payroll and overtime"},
    {"zh-CN": "按考勤算工资、加班、扣款，出一张工资条",
     "zh-TW": "依出勤算薪資、加班、扣款，出一張薪資單",
     "en": "Compute pay, overtime, and deductions from attendance, and produce a payslip"},
    [
        ("要做什么", {
            "zh-CN": "一个小工具，读考勤表算每人当月工资：基本工资 + 加班费 − 请假扣款 − 社保，生成每人一张工资条",
            "zh-TW": "一個小工具，讀出勤表算每人當月薪資：底薪 + 加班費 − 請假扣款 − 勞健保，產生每人一張薪資單",
            "en": "A small tool that reads the attendance sheet and computes each person's monthly pay: base + overtime − leave deduction − insurance, producing one payslip per person"}),
        ("现在怎么做", {
            "zh-CN": "用 Excel 手拉公式逐人算，20 多个人算一整天，公式拖错一个整列都错",
            "zh-TW": "用 Excel 手拉公式逐人算，20 幾個人算一整天，公式拖錯一個整欄都錯",
            "en": "I drag formulas by hand person by person; 20-plus people take a full day, and one bad drag corrupts a whole column"}),
        ("输入", {
            "zh-CN": "一个考勤 .xlsx（姓名/日期/上班/下班/请假类型），外加一张人员 .xlsx（姓名/基本工资/社保基数）；约 25 人 × 30 天",
            "zh-TW": "一份出勤 .xlsx（姓名／日期／上班／下班／請假類型），外加一份人員 .xlsx（姓名／底薪／勞健保投保薪資）；約 25 人 × 30 天",
            "en": "One attendance .xlsx (name / date / clock-in / clock-out / leave type) plus one roster .xlsx (name / base pay / insurance base); about 25 people x 30 days"}),
        ("输出", {
            "zh-CN": "屏幕显示每人合计与异常（缺打卡、跨天班）；导出 Excel 汇总表 + 每人一个工资条（Word 或单页 PDF），文件名 = 姓名_年月",
            "zh-TW": "螢幕顯示每人合計與異常（漏打卡、跨日班）；匯出 Excel 彙總表 + 每人一張薪資單（Word 或單頁 PDF），檔名 = 姓名_年月",
            "en": "Show each person's total and anomalies (missing punches, overnight shifts); export an Excel summary plus one payslip per person (Word or single-page PDF) named name_yyyy-mm"}),
        ("怎么算做好了", {
            "zh-CN": "拿上个月的数据跑一遍，25 个人的实发金额和财务核对过的数字完全一致；加班时长按 1.5/2/3 倍分段，不能统一按一个倍数算",
            "zh-TW": "拿上個月的資料跑一遍，25 個人的實發金額和財務核對過的數字完全一致；加班時數依 1.5／2／3 倍分段，不能統一用一個倍數算",
            "en": "Run last month's data: all 25 net amounts match finance's verified figures; overtime must be banded at 1.5 / 2 / 3x rather than one flat multiplier"}),
        ("出错怎么办", {
            "zh-CN": "考勤表有缺打卡时不要当 0 小时算，那天标黄并列出让我确认；人员表里有人当天没记录也要列出来",
            "zh-TW": "出勤表有漏打卡時不要當 0 小時算，那天標黃並列出讓我確認；人員表裡有人當天沒紀錄也要列出來",
            "en": "On a missing punch do not treat it as zero hours — highlight that day and list it for me to confirm; anyone absent from the roster for that day must also be listed"}),
        ("不做什么", {
            "zh-CN": "不做报税申报、不做银行代发、不做考勤打卡本身；只管算数出表",
            "zh-TW": "不做報稅申報、不做銀行代發、不做打卡本身；只管算數字出表",
            "en": "No tax filing, no bank transfers, no clock-in itself — it only computes and produces sheets"}),
        ("给谁用", {
            "zh-CN": "我和财务 1 个人用；工资数据绝对不能上传，导出的工资条要能单独发给个人",
            "zh-TW": "我和財務 1 個人用；薪資資料絕對不能上傳，匯出的薪資單要能單獨發給個人",
            "en": "Me and one finance colleague; payroll data must never be uploaded, and each payslip must be sendable to that person alone"}),
    ],
)

# ---------------------------------------------------------------- 7 行业：库存对账提示
add(
    "stock-reconcile",
    {"zh-CN": "库存与出入库核对", "zh-TW": "庫存與出入庫核對", "en": "Stock and movement reconciliation"},
    {"zh-CN": "账面库存和实际盘点对不上，要找出差异来源",
     "zh-TW": "帳面庫存和實際盤點對不上，要找出差異來源",
     "en": "Book stock does not match the physical count — find where the difference comes from"},
    [
        ("要做什么", {
            "zh-CN": "核对库存：用期初 + 入库 − 出库 算理论结存，和实际盘点数比，找出对不上的商品",
            "zh-TW": "核對庫存：用期初 + 入庫 − 出庫 算理論結存，和實際盤點數比，找出對不上的商品",
            "en": "Reconcile stock: compute theoretical closing from opening + inbound − outbound, compare with the physical count, and list the products that disagree"}),
        ("现在怎么做", {
            "zh-CN": "把三张表导出来贴到一起，用 VLOOKUP 拉，几百个 SKU 拉到后面 VLOOKUP 报错一片，查半天查不出哪错了",
            "zh-TW": "把三張表匯出後貼在一起，用 VLOOKUP 拉，幾百個 SKU 拉到後面 VLOOKUP 一片錯誤，查半天查不出哪裡錯",
            "en": "I export three sheets, paste them together, and VLOOKUP across hundreds of SKUs; the lookups break en masse and I cannot find the cause"}),
        ("输入", {
            "zh-CN": "三个 .xlsx：期初库存（SKU/名称/数量）、入库单（日期/SKU/数量）、出库单（日期/SKU/数量），外加盘点表（SKU/实盘数量）；约 800 个 SKU",
            "zh-TW": "三個 .xlsx：期初庫存（SKU／名稱／數量）、入庫單（日期／SKU／數量）、出庫單（日期／SKU／數量），外加盤點表（SKU／實盤數量）；約 800 個 SKU",
            "en": "Three .xlsx files — opening stock (SKU/name/qty), inbound (date/SKU/qty), outbound (date/SKU/qty) — plus a count sheet (SKU/actual qty); about 800 SKUs"}),
        ("输出", {
            "zh-CN": "屏幕显示：只在一张表里出现过的 SKU、理论结存与实盘差异、差异金额（按最新进价估）；导出 Excel 到桌面",
            "zh-TW": "螢幕顯示：只出現在其中一張表的 SKU、理論結存與實盤差異、差異金額（依最新進價估）；匯出 Excel 到桌面",
            "en": "Show: SKUs appearing in only one sheet, theoretical-vs-count differences, and the value of each difference (at latest cost); export Excel to the desktop"}),
        ("怎么算做好了", {
            "zh-CN": "拿上个月已经人工核对过的数据跑一遍，找出的差异 SKU 和人工核对的完全一致，差异金额加总也一致",
            "zh-TW": "拿上個月已經人工核對過的資料跑一遍，找出的差異 SKU 和人工核對的完全一致，差異金額加總也一致",
            "en": "Run last month's manually verified data: the differing SKUs match the manual result exactly, including the total difference value"}),
        ("出错怎么办", {
            "zh-CN": "SKU 有前后空格或大小写不一致时先标准化再比对，不要当成两个商品；同一 SKU 在一张表里出现多行要合并求和",
            "zh-TW": "SKU 有前後空白或大小寫不一致時先標準化再比對，不要當成兩個商品；同一 SKU 在同一張表出現多列要合併加總",
            "en": "Normalize SKUs (trim whitespace, case) before comparing — do not treat them as two products; merge and sum repeated rows for the same SKU"}),
        ("不做什么", {
            "zh-CN": "不做采购下单、不做库存预警、不改原始单据；只做核对和差异清单",
            "zh-TW": "不做採購下單、不做庫存預警、不改原始單據；只做核對和差異清單",
            "en": "No purchase ordering, no reorder alerts, no editing source documents — only reconciliation and a difference list"}),
        ("给谁用", {
            "zh-CN": "我和仓管 1 个人用；进价和供应商信息不能外传",
            "zh-TW": "我和倉管 1 個人用；進價和供應商資訊不能外流",
            "en": "Me and one warehouse colleague; cost and supplier information must not leave the company"}),
    ],
)

# ---------------------------------------------------------------- 8 行业：排班
add(
    "shift-schedule",
    {"zh-CN": "排班表生成", "zh-TW": "排班表產生", "en": "Shift scheduling"},
    {"zh-CN": "按人数和规则排一个月的班，还要统计每人班次数",
     "zh-TW": "依人數和規則排一個月的班，還要統計每人班次數",
     "en": "Build a monthly roster from headcount and rules, and count each person's shifts"},
    [
        ("要做什么", {
            "zh-CN": "生成下个月的排班表：把人员按早/中/晚三班轮排，保证每天每班人数够，并统计每人各上几个班",
            "zh-TW": "產生下個月的排班表：把人員依早／中／晚三班輪排，確保每天每班人數足夠，並統計每人各上幾個班",
            "en": "Generate next month's roster: rotate staff across morning/afternoon/night shifts, keep each shift staffed, and count each person's shifts"}),
        ("现在怎么做", {
            "zh-CN": "在 Excel 里手动拖，拖完还要一个个数班次，谁多谁少经常吵，改一个人的班导致整月重排",
            "zh-TW": "在 Excel 裡手動拖，拖完還要一筆筆數班次，誰多誰少常常吵，改一個人的班就整個月重排",
            "en": "I drag cells around in Excel, then count shifts by hand; there are always arguments about fairness, and changing one person forces a full redo"}),
        ("输入", {
            "zh-CN": "一个人员 .xlsx（姓名/工号/能否上夜班/指定休息日），加规则：每天每班需要几人、每人每月最多几个夜班、连续上班不超过几天",
            "zh-TW": "一份人員 .xlsx（姓名／工號／能否上夜班／指定休息日），加規則：每天每班需要幾人、每人每月最多幾個夜班、連續上班不超過幾天",
            "en": "One staff .xlsx (name / id / can-work-nights / fixed days off), plus rules: how many people per shift per day, max night shifts per person per month, max consecutive working days"}),
        ("输出", {
            "zh-CN": "屏幕显示下月排班表（行=人，列=日期，格=班次）；导出 Excel，能直接打印贴在墙上；另出一张每人班次统计",
            "zh-TW": "螢幕顯示下月排班表（列=人，欄=日期，格=班次）；匯出 Excel，能直接列印貼在牆上；另出一張每人班次統計",
            "en": "Show next month's roster (rows = people, columns = days, cells = shift); export an Excel file that prints cleanly for the wall, plus a per-person shift count"}),
        ("怎么算做好了", {
            "zh-CN": "生成的表里 30 天每班人数都不少于要求；没有人在同一天排两个班；没有人连续上班超过 6 天；每人夜班数不超过上限；如果规则冲突，要告诉我冲突在哪而不是硬排",
            "zh-TW": "產生的表裡 30 天每班人數都不少於要求；沒有人在同一天排兩個班；沒有人連續上班超過 6 天；每人夜班數不超過上限；如果規則衝突，要告訴我衝突在哪而不是硬排",
            "en": "Every shift meets its headcount for all 30 days; nobody is double-booked on a day; no one exceeds 6 consecutive working days; night-shift caps hold; if the rules conflict, tell me where instead of forcing a roster"}),
        ("出错怎么办", {
            "zh-CN": "规则排不下时不要静默舍弃条件，要明确列出「哪条规则没满足、卡在哪天、建议放宽哪条」",
            "zh-TW": "規則排不下時不要默默捨棄條件，要明確列出「哪條規則沒滿足、卡在哪天、建議放寬哪條」",
            "en": "When the rules cannot be satisfied, do not silently drop a constraint — list which rule failed, on which day, and which one to relax"}),
        ("不做什么", {
            "zh-CN": "不做打卡考勤、不做工资结算、不做请假审批；只出排班表和班次统计",
            "zh-TW": "不做打卡出勤、不做薪資結算、不做請假簽核；只出排班表和班次統計",
            "en": "No clock-in tracking, no payroll, no leave approval — only the roster and shift counts"}),
        ("给谁用", {
            "zh-CN": "店长和我用，Windows 电脑；员工姓名和排班不能外传",
            "zh-TW": "店長和我用，Windows 電腦；員工姓名和排班不能外流",
            "en": "The store manager and me, on Windows; staff names and the roster must stay internal"}),
    ],
)

# ---------------------------------------------------------------- 渲染成 JS
FIELD_KEYS = {
    "要做什么": "goal",
    "现在怎么做": "pain",
    "输入": "input",
    "输出": "output",
    "怎么算做好了": "done",
    "出错怎么办": "error",
    "不做什么": "scopeOut",
    "给谁用": "operator",
}

lines = []
lines.append("/**")
lines.append(" * 行业模板库（三语）")
lines.append(" *")
lines.append(" * 市场调研结论：DSH 插件市场里没人做「需求模板库」。")
lines.append(" * 它正好补上「需求体检」的另一半 —— 体检告诉你缺什么，")
lines.append(" * 模板告诉你这一行通常要写什么，直接照着填。")
lines.append(" *")
lines.append(" * 每份模板 = 一组预填好的格子。用户挑一个，把示例替换成自己的内容即可。")
lines.append(" * 字段顺序固定：goal / pain / input / output / done / error / scopeOut / operator")
lines.append(" * （这个顺序是按「先说做什么 → 再说现在怎么做 → 输入 → 输出 → 验收 → 异常 → 边界 → 使用者」排的）")
lines.append(" */")
lines.append("")
lines.append("export const TEMPLATES = [")
for t in T:
    lines.append("  {")
    lines.append("    id: %s," % json.dumps(t["id"], ensure_ascii=False))
    lines.append("    name: %s," % json.dumps(t["name"], ensure_ascii=False))
    lines.append("    scene: %s," % json.dumps(t["scene"], ensure_ascii=False))
    lines.append("    fields: {")
    for key_zh, texts in t["fields"]:
        lines.append("      %s: %s," % (FIELD_KEYS[key_zh], json.dumps(texts, ensure_ascii=False)))
    lines.append("    },")
    lines.append("  },")
lines.append("]")
lines.append("")
lines.append("/** 字段的显示名（三语），渲染草案时用 */")
lines.append("export const FIELD_LABELS = {")
for key_zh, key_en in FIELD_KEYS.items():
    labels = {}
    for t in T:
        for k2, texts in t["fields"]:
            if k2 == key_zh:
                labels = texts
                break
        break
    # 字段名本身不需要三语以外的翻译，这里用模板里出现过的中文/英文名
    labels = {
        "zh-CN": key_zh,
        "zh-TW": {
            "要做什么": "要做什麼", "现在怎么做": "現在怎麼做", "输入": "輸入", "输出": "輸出",
            "怎么算做好了": "怎麼算做好了", "出错怎么办": "出錯怎麼辦",
            "不做什么": "不做什麼", "给谁用": "給誰用",
        }[key_zh],
        "en": {
            "要做什么": "What to build", "现在怎么做": "How it is done today", "输入": "Input",
            "输出": "Output", "怎么算做好了": "What counts as done",
            "出错怎么办": "What happens on error", "不做什么": "Out of scope", "给谁用": "Who uses it",
        }[key_zh],
    }
    lines.append("  %s: %s," % (key_en, json.dumps(labels, ensure_ascii=False)))
lines.append("}")

out = "\n".join(lines) + "\n"
# 输出到本仓库的 src/templates.js（不写死本机绝对路径）
path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                    "src", "templates.js")
io.open(path, "w", encoding="utf-8").write(out)
print("已生成:", path)
print("模板数:", len(T))
print("每个模板字段数:", [len(t["fields"]) for t in T])
print("id:", [t["id"] for t in T])
