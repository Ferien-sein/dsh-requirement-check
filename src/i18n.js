/**
 * 三语文案：简体中文 / 繁體中文 / English
 *
 * 分工：
 *   - 盲区标题/理由/句式在这里（给人看的正文）
 *   - 命中用的正则规则在 blindspots.js 的 SINGLE_SOURCE 里（按语言分组）
 *
 * 繁体用词按台湾/香港习惯（資訊、資料、範例、篩選…），不是简单转码。
 */

export const STRINGS = {
  // ================================================================ 简体中文
  'zh-CN': {
    localeName: '简体中文',
    severity: { high: 'high', mid: 'mid', low: 'low' },
    severityWord: { high: '高优先级', mid: '中优先级', low: '低优先级' },
    level: {
      excellent: '很完整',
      good: '基本够用',
      thin: '偏薄，建议补',
      vague: '太笼统，AI 只能猜',
      empty: '空',
    },
    reportTitle: '需求体检',
    headerFmt: '【需求体检】完整度 {score}/100（{level}）· 覆盖 {covered}/{total} 项',
    emptyReport: '没有拿到需求描述。至少写一句「我想做什么」才能体检。',
    allGood: '关键项都在。剩下的是可以再补的细节：',
    mustFixFmt: '有 {n} 个高优先级盲区必须补上，否则大概率要返工：',
    howToFix: '怎么补：',
    suggestMore: '建议补充（影响较小，但有更好）：',
    notShownFmt: '（另有 {n} 项未列出，可调大 max_items 查看全部）',
    tooShort: '提示：你提供的内容偏短，通常说明还有很多信息没说。可以直接照上面的句式补。',
    tailOk: '我可以按这份描述开工了。',
    tailNeedMore: '把缺的补上再发给我，能少返工很多。',
    toolCheckDesc:
      '检查一段需求描述是否说清楚了，指出遗漏的关键项（做什么、不做什么、验收标准、输入输出格式、异常处理等），' +
      '并给出可直接照抄的补充句式。当用户说“帮我看看需求写得对不对”“我要做个小工具但不知道怎么说清楚”“需求体检”时使用。' +
      '只做检查，不改写、不发挥、不替用户编造需求。',
    paramText: '用户写的需求描述原文。原样传入，不要预先润色或补全。',
    paramMaxItems: '最多列出几条待补项，默认 8。',
    outCheck: '体检结果：分数、等级、缺失项清单与直接可读的报告',
    toolTplDesc:
      '列出或取回「需求模板」。用户不知道该怎么描述时，给他一份贴近场景的模板照着填。' +
      '当用户说“不知道怎么写需求”“有没有现成的例子”“给我个模板”时使用。' +
      '不传参数则列出全部模板；传 keyword 按关键词筛选；传 template_id 取回可编辑的草案全文。',
    paramKeyword: '按关键词筛选，例如 汇总、对账、报价、记账、排班、整理。',
    paramTemplateId: '要取回全文的模板 id。',
    outTpl: '模板清单，或某一套模板的可编辑草案',
    tplNotFoundFmt: '没有 id 为 {id} 的模板。可用：{ids}',
    tplDraftHint: '请把草案里的示例内容替换成你的实际情况，然后再做一次 requirement_check。',
    tplListHint: '确定用户要哪一个之后，再用 template_id 取回草案全文。',
    tplNoneHint: '没有匹配的模板。可建议用户直接口述需求，然后用 requirement_check 体检。',
    toolLocaleDesc:
      '设置需求体检使用的语言（简体中文 / 繁體中文 / English），并记住这个选择。' +
      '当用户说“用繁体”“切换成英文”“switch to English”“說中文”时使用。',
    paramLocale: '目标语言。可选 zh-CN（简体中文）/ zh-TW（繁體中文）/ en（English）。',
    outLocale: '语言切换结果',
    localeSwitchedFmt: '已切换到 {name}。之后的需求体检与模板都会用这个语言。',
    localeSaveFailed: '语言已在本进程生效，但写入偏好文件失败（目录可能只读），下次启动会回到默认。',
    localeCurrentFmt: '当前语言：{name}。',
    paramTarget: '目标系统与位数。默认 auto = 跟随使用者自己的电脑。',
    outPlatform: '本机平台信息（供确认默认值）',
    platformCurrentFmt: '本机：{osLabel} {bits} 位{archNote}',
    platformTargetFmt: '默认目标：{target}',
    platformCertainty: '说明：探测的是运行本插件的机器。若目标用户用的是别的系统或 32 位机器，请以对方为准。',
    toolPlatformDesc:
      '查看本机（使用者电脑）的操作系统与位数，并给出默认的目标平台。' +
      '当需要确定「这个软件要跑在什么系统、32 位还是 64 位」时使用；' +
      '不特别说明时，默认就按使用者自己的电脑来做。',
    paramSetDefault: '是否把选定的 target 存为默认值（下次不用再传）。',
    platformHeadingPrefix: '【',
    platformHeadingSuffix: '】',
    platformHeading: '目标系统与位数',
    platformHowTo: '句式：要跑在【Windows / macOS / Linux】，【32 位 / 64 位】；如果不确定，就按我的电脑来。',
    localeNoteFmt: '（当前语言：{name}。可用 locale 参数切换：{all}）',
    promptHint:
      '当用户提出要做一个软件或工具这类需求时，先用 requirement_check 体检他的描述，' +
      '把高优先级盲区（做什么、不做什么、验收标准、输入输出格式）问清楚再动手；' +
      '用户不知道怎么写时，用 requirement_template 给一份贴近场景的模板让他照填。' +
      '不要替他编造需求。按用户使用的语言回答（简体中文 / 繁體中文 / English）。',
    spotTitles: {
      goal: '要做什么（一句话目标）',
      'scope-out': '明确不做什么（范围边界）',
      done: '怎么算做好了（验收标准）',
      input: '输入是什么样（数据来源与格式）',
      output: '输出长什么样（结果与格式）',
      'error-case': '出错时怎么办（异常与边界）',
      operator: '谁来用、几个人用（使用者）',
      environment: '在哪运行、要不要联网（环境）',
      privacy: '数据敏感性与限制（隐私）',
      volume: '数据量级（多少条/多大）',
      frequency: '多久用一次、一次多久（使用节奏）',
      pain: '现在是怎么做的（痛点基线）',
      reference: '参照物或样例（有就更好）',
      delivery: '怎么交付、以后怎么打开（使用方式）',
      arch: '32 位还是 64 位（能不能在对方机器上跑）',
    },
    spotWhy: {
      goal: '没有这句话，后面所有讨论都没有落脚点，AI 只能猜你想干什么。',
      'scope-out': '不说清边界，AI 容易顺手加一堆你不需要的功能，改起来更累。',
      done: '没有可验证的完成标准，就没法判断做出来的是不是你要的，只能靠感觉。',
      input: '输入格式不说清，最常见的结局是「跑起来了但读错了」，而且很难发现。',
      output: '输出形态决定实现方式和你的使用方式，漏了往往要重做界面。',
      'error-case': '只描述顺利情况，遇到数据缺列、文件损坏、金额对不上时程序就不知所措。',
      operator: '自己用和多人用，做法完全不同（要不要账号、要不要联网、数据放哪）。',
      environment: '决定做成桌面程序还是网页，以及数据能不能出去。',
      privacy: '涉及客户资料、金额、身份信息时，这一条不写清可能造成合规问题。',
      volume: '几十行和几十万行，写法完全不同；量级不清容易做出跑不动的版本。',
      frequency: '偶尔用一次和每天用几十次，对速度和自动化的要求不一样。',
      pain: '现状是判断「有没有真的变好」的唯一参照；也能让 AI 理解你的真实流程。',
      reference: '一个真实样例文件或参照界面，比形容一百句都准。',
      delivery: '决定最终给你 exe、文件夹还是网页；不写清可能拿到一堆没法直接用的东西。',
      arch: '64 位程序在 32 位系统上跑不起来；不确定时按使用者自己的电脑来做最稳，但要写明。',
    },
    spotFix: {
      goal: '句式：我想做一个【什么东西】，用来【解决什么问题】。',
      'scope-out': '句式：这一版不做【某某功能】；也不要【某某行为】。',
      done: '句式：拿【什么数据】跑一遍，看到【什么结果】，就算成功。最好带数字。',
      input: '句式：输入是【几个】【什么格式】文件，放在【哪里】，第一行是标题吗，大概多少行，有哪些列。',
      output: '句式：屏幕上看【什么】；生成【什么格式】文件，文件名【怎么起】，保存到【哪个目录】。',
      'error-case': '句式：如果【某情况】，希望它【怎么处理】（跳过 / 标红 / 停下问我）。',
      operator: '句式：只有我自己用 / 我和【几个】同事用 / 要给外部人用。',
      environment: '句式：在【什么系统】上【怎么打开】，需不需要联网；数据能不能上传。',
      privacy: '句式：数据【能不能】上传到网上；绝对不能动【哪些文件/目录】。',
      volume: '句式：每次大概处理【多少行/多少条/多大文件】。',
      frequency: '句式：我【每天/每周】用【几次】，每次大约【几分钟】。',
      pain: '句式：现在我是【手动怎么做的】，大约要花【多久】，容易在【哪里】出错。',
      reference: '句式：我放了一份样例在【路径】；界面参考【某软件】。',
      delivery: '句式：给我【一个 exe / 一个文件夹，双击里面某个文件】；要放桌面。',
      arch: '句式：跑在【Windows / macOS / Linux】【32 位 / 64 位】；不确定就按我的电脑来。',
    },
  },

  // ================================================================ 繁體中文
  'zh-TW': {
    localeName: '繁體中文',
    severity: { high: 'high', mid: 'mid', low: 'low' },
    severityWord: { high: '高優先', mid: '中優先', low: '低優先' },
    level: {
      excellent: '很完整',
      good: '大致夠用',
      thin: '偏薄，建議補',
      vague: '太籠統，AI 只能用猜的',
      empty: '空白',
    },
    reportTitle: '需求健檢',
    headerFmt: '【需求健檢】完整度 {score}/100（{level}）· 涵蓋 {covered}/{total} 項',
    emptyReport: '沒有拿到需求描述。至少要寫一句「我想做什麼」才能健檢。',
    allGood: '關鍵項目都有了。剩下的是可以再補的細節：',
    mustFixFmt: '有 {n} 個高優先盲區必須補上，否則很可能要重做：',
    howToFix: '怎麼補：',
    suggestMore: '建議補充（影響較小，但有更好）：',
    notShownFmt: '（另有 {n} 項未列出，可調大 max_items 查看全部）',
    tooShort: '提示：你提供的內容偏短，通常代表還有很多資訊沒說。可以直接照上面的句式補。',
    tailOk: '我可以照這份描述開工了。',
    tailNeedMore: '把缺的補上再發給我，能少重做很多。',
    toolCheckDesc:
      '檢查一段需求描述是否說得夠清楚，指出遺漏的關鍵項目（要做什麼、不做什麼、驗收標準、輸入輸出格式、異常處理等），' +
      '並給出可直接照抄的補充句式。當使用者說「幫我看看需求寫得對不對」「我想做個小工具但不知道怎麼說清楚」「需求健檢」時使用。' +
      '只做檢查，不改寫、不延伸、不替使用者編造需求。',
    paramText: '使用者寫的需求描述原文。原樣傳入，不要事先潤飾或補齊。',
    paramMaxItems: '最多列出幾項待補，預設 8。',
    outCheck: '健檢結果：分數、等級、缺漏清單與可直接閱讀的報告',
    toolTplDesc:
      '列出或取回「需求範本」。使用者不知道怎麼描述時，給一份貼近情境的範本照著填。' +
      '當使用者說「不知道怎麼寫需求」「有沒有現成的例子」「給我一個範本」時使用。' +
      '不傳參數則列出全部範本；傳 keyword 依關鍵字篩選；傳 template_id 取回可編輯的草案全文。',
    paramKeyword: '依關鍵字篩選，例如 彙總、對帳、報價、記帳、排班、整理。',
    paramTemplateId: '要取回全文的範本 id。',
    outTpl: '範本清單，或某一套範本的可編輯草案',
    tplNotFoundFmt: '沒有 id 為 {id} 的範本。可用：{ids}',
    tplDraftHint: '請把草案裡的範例內容換成你的實際情況，然後再做一次 requirement_check。',
    tplListHint: '確定使用者要哪一個之後，再用 template_id 取回草案全文。',
    tplNoneHint: '沒有符合的範本。可建議使用者直接口述需求，再用 requirement_check 健檢。',
    toolLocaleDesc:
      '設定需求健檢使用的語言（简体中文 / 繁體中文 / English），並記住這個選擇。' +
      '當使用者說「用繁體」「切換成英文」「switch to English」「說中文」時使用。',
    paramLocale: '目標語言。可選 zh-CN（简体中文）／ zh-TW（繁體中文）／ en（English）。',
    outLocale: '語言切換結果',
    localeSwitchedFmt: '已切換到 {name}。之後的需求健檢與範本都會用這個語言。',
    localeSaveFailed: '語言已在本次執行生效，但寫入偏好檔案失敗（目錄可能唯讀），下次啟動會回到預設值。',
    localeCurrentFmt: '目前語言：{name}。',
    paramTarget: '目標系統與位元數。預設 auto = 跟隨使用者自己的電腦。',
    outPlatform: '本機平台資訊（供確認預設值）',
    platformCurrentFmt: '本機：{osLabel} {bits} 位元{archNote}',
    platformTargetFmt: '預設目標：{target}',
    platformCertainty: '說明：偵測的是執行本插件的機器。若目標使用者用的是別的系統或 32 位元機器，請以對方為準。',
    toolPlatformDesc:
      '查看本機（使用者電腦）的作業系統與位元數，並給出預設的目標平台。' +
      '當需要確定「這個軟體要跑在什麼系統、32 位元還是 64 位元」時使用；' +
      '沒有特別說明時，預設就照使用者自己的電腦來做。',
    paramSetDefault: '是否把選定的 target 存為預設值（下次不用再傳）。',
    platformHeadingPrefix: '【',
    platformHeadingSuffix: '】',
    platformHeading: '目標系統與位元數',
    platformHowTo: '句式：要跑在【Windows／macOS／Linux】，【32 位元／64 位元】；如果不確定，就照我的電腦來。',
    localeNoteFmt: '（目前語言：{name}。可用 locale 參數切換：{all}）',
    promptHint:
      '當使用者提出要做一個軟體或工具這類需求時，先用 requirement_check 健檢他的描述，' +
      '把高優先盲區（要做什麼、不做什麼、驗收標準、輸入輸出格式）問清楚再動手；' +
      '使用者不知道怎麼寫時，用 requirement_template 給一份貼近情境的範本照著填。' +
      '不要替他編造需求。依使用者使用的語言回答（简体中文 / 繁體中文 / English）。',
    spotTitles: {
      goal: '要做什麼（一句話目標）',
      'scope-out': '明確不做什麼（範圍界線）',
      done: '怎麼算做好了（驗收標準）',
      input: '輸入是什麼樣子（資料來源與格式）',
      output: '輸出長什麼樣子（結果與格式）',
      'error-case': '出錯時怎麼辦（異常與邊界）',
      operator: '誰來用、幾個人用（使用者）',
      environment: '在哪裡執行、要不要連線（環境）',
      privacy: '資料敏感性與限制（隱私）',
      volume: '資料量級（多少筆／多大）',
      frequency: '多久用一次、一次多久（使用節奏）',
      pain: '現在是怎麼做的（痛點基準）',
      reference: '參考物或範例（有就更好）',
      delivery: '怎麼交付、以後怎麼打開（使用方式）',
      arch: '32 位元還是 64 位元（能不能在對方電腦上跑）',
    },
    spotWhy: {
      goal: '沒有這句話，後面所有討論都沒有立足點，AI 只能猜你想做什麼。',
      'scope-out': '不說清楚界線，AI 容易順手加一堆你不需要的功能，改起來更累。',
      done: '沒有可驗證的完成標準，就無法判斷做出來的是不是你想要的，只能靠感覺。',
      input: '輸入格式不說清楚，最常見的結果是「跑起來了但讀錯了」，而且很難發現。',
      output: '輸出形態決定實作方式與你的使用方式，漏了往往要重做介面。',
      'error-case': '只描述順利的情況，遇到資料缺欄、檔案損毀、金額對不上時程式就不知所措。',
      operator: '自己用和多人用，做法完全不同（要不要帳號、要不要連線、資料放哪裡）。',
      environment: '決定做成桌面程式還是網頁，以及資料能不能出去。',
      privacy: '涉及客戶資料、金額、身分資訊時，這一項不寫清楚可能造成合規問題。',
      volume: '幾十筆和幾十萬筆，寫法完全不同；量級不清楚容易做出跑不動的版本。',
      frequency: '偶爾用一次和每天用幾十次，對速度與自動化的要求不一樣。',
      pain: '現況是判斷「有沒有真的變好」的唯一基準；也能讓 AI 理解你的真實流程。',
      reference: '一個真實的範例檔案或參考介面，比形容一百句都準。',
      delivery: '決定最後給你 exe、資料夾還是網頁；不寫清楚可能拿到一堆沒辦法直接用的東西。',
      arch: '64 位元的程式在 32 位元系統上跑不起來；不確定時照使用者自己的電腦來做最穩，但要寫明。',
    },
    spotFix: {
      goal: '句式：我想做一個【什麼東西】，用來【解決什麼問題】。',
      'scope-out': '句式：這一版不做【某某功能】；也不要【某某行為】。',
      done: '句式：拿【什麼資料】跑一遍，看到【什麼結果】，就算成功。最好帶數字。',
      input: '句式：輸入是【幾個】【什麼格式】檔案，放在【哪裡】，第一列是標題嗎，大概幾列，有哪些欄位。',
      output: '句式：螢幕上看【什麼】；產生【什麼格式】檔案，檔名【怎麼取】，存到【哪個目錄】。',
      'error-case': '句式：如果【某情況】，希望它【怎麼處理】（跳過／標紅／停下來問我）。',
      operator: '句式：只有我自己用／我和【幾個】同事用／要給外部的人用。',
      environment: '句式：在【什麼系統】上【怎麼打開】，需不需要連線；資料能不能上傳。',
      privacy: '句式：資料【能不能】上傳到網路上；絕對不能動【哪些檔案／目錄】。',
      volume: '句式：每次大概處理【多少列／多少筆／多大的檔案】。',
      frequency: '句式：我【每天／每週】用【幾次】，每次大約【幾分鐘】。',
      pain: '句式：現在我是【手動怎麼做的】，大約要花【多久】，容易在【哪裡】出錯。',
      reference: '句式：我放了一份範例在【路徑】；介面參考【某個軟體】。',
      delivery: '句式：給我【一個 exe／一個資料夾，雙擊裡面某個檔案】；要放桌面。',
      arch: '句式：跑在【Windows／macOS／Linux】【32 位元／64 位元】；不確定就照我的電腦來。',
    },
  },

  // ================================================================ English
  en: {
    localeName: 'English',
    severity: { high: 'high', mid: 'mid', low: 'low' },
    severityWord: { high: 'high priority', mid: 'medium priority', low: 'low priority' },
    level: {
      excellent: 'very complete',
      good: 'mostly sufficient',
      thin: 'thin — worth filling in',
      vague: 'too vague — the AI can only guess',
      empty: 'empty',
    },
    reportTitle: 'Requirement check',
    headerFmt: '[Requirement check] Completeness {score}/100 ({level}) · {covered}/{total} covered',
    emptyReport: 'No requirement text was provided. At least one line saying what you want built is needed.',
    allGood: 'All key items are present. What follows is optional detail:',
    mustFixFmt: '{n} high-priority blind spot(s) must be filled in, otherwise rework is likely:',
    howToFix: 'How to fill it in: ',
    suggestMore: 'Suggested additions (lower impact, but still worth it):',
    notShownFmt: '({n} more item(s) not listed — raise max_items to see all)',
    tooShort: 'Note: what you provided is quite short, which usually means a lot is still unsaid. You can fill it in using the patterns above.',
    tailOk: 'I can start work from this description.',
    tailNeedMore: 'Fill in what is missing and send it again — it saves a lot of rework.',
    toolCheckDesc:
      'Audit a requirement description for gaps and name what is missing (goal, explicit non-goals, acceptance criteria, ' +
      'input/output shape, error handling, and more), with copy-ready sentence patterns for each gap. ' +
      'Use when the user asks "is my requirement clear enough?", "I want to build a small tool but cannot describe it", or "requirement check". ' +
      'This tool only audits. It does not rewrite, expand, or invent requirements.',
    paramText: 'The user\'s requirement text, verbatim. Do not polish or complete it beforehand.',
    paramMaxItems: 'Maximum number of missing items to list. Defaults to 8.',
    outCheck: 'Audit result: score, level, missing-item list, and a directly readable report',
    toolTplDesc:
      'List or fetch requirement templates. Give one to a user who does not know how to describe what they want, so they can fill it in. ' +
      'Use when the user says "I do not know how to write a requirement", "is there an example", or "give me a template". ' +
      'With no arguments it lists all templates; keyword filters by text; template_id returns the editable draft.',
    paramKeyword: 'Filter by keyword, e.g. merge, reconcile, quote, log, schedule, cleanup.',
    paramTemplateId: 'Template id whose full draft should be returned.',
    outTpl: 'A template list, or one template\'s editable draft',
    tplNotFoundFmt: 'No template with id {id}. Available: {ids}',
    tplDraftHint: 'Replace the example content with your own situation, then run requirement_check again.',
    tplListHint: 'Once the user picks one, call again with template_id to get the full draft.',
    tplNoneHint: 'No matching template. Suggest the user describe the need in their own words, then run requirement_check.',
    toolLocaleDesc:
      'Set the language used by the requirement tools (简体中文 / 繁體中文 / English) and remember it. ' +
      'Use when the user says "use traditional Chinese", "switch to English", "in Chinese please", etc.',
    paramLocale: 'Target language: zh-CN (Simplified Chinese) / zh-TW (Traditional Chinese) / en (English).',
    outLocale: 'Language switch result',
    localeSwitchedFmt: 'Switched to {name}. Requirement checks and templates will use this language from now on.',
    localeSaveFailed: 'The language is active for this run, but writing the preference file failed (directory may be read-only); the next start will fall back to the default.',
    localeCurrentFmt: 'Current language: {name}.',
    paramTarget: "Target platform and bitness. Default auto = follow the user's own machine.",
    outPlatform: 'Local platform info (to confirm the default)',
    platformCurrentFmt: 'Local machine: {osLabel} {bits}-bit{archNote}',
    platformTargetFmt: 'Default target: {target}',
    platformCertainty: 'Note: this detects the machine running the plugin. If the intended user is on a different OS or a 32-bit machine, follow theirs.',
    toolPlatformDesc:
      "Show the local machine's OS and bitness and the default target platform. " +
      'Use when deciding which system the software must run on and whether 32-bit or 64-bit; ' +
      "when nothing is stated, default to the user's own machine.",
    paramSetDefault: 'Whether to persist the chosen target as the default (so it need not be passed again).',
    platformHeadingPrefix: '',
    platformHeadingSuffix: ':',
    platformHeading: 'Target platform and bitness',
    platformHowTo: 'Pattern: It runs on [Windows / macOS / Linux], [32-bit / 64-bit]; if unsure, follow my own machine.',
    localeNoteFmt: '(Current language: {name}. Switch with the locale argument: {all})',
    promptHint:
      'When the user asks to build a piece of software or a tool, first run requirement_check on their description and ' +
      'clarify the high-priority blind spots (goal, explicit non-goals, acceptance criteria, input/output shape) before starting; ' +
      'if they do not know how to describe it, use requirement_template to hand them a scenario-close template to fill in. ' +
      'Never invent requirements on their behalf. Reply in the language the user is using ' +
      '(简体中文 / 繁體中文 / English).',
    spotTitles: {
      goal: 'What to build (one-sentence goal)',
      'scope-out': 'What NOT to build (scope boundary)',
      done: 'What counts as done (acceptance criteria)',
      input: 'What the input looks like (source and format)',
      output: 'What the output looks like (result and format)',
      'error-case': 'What happens on error (edge cases)',
      operator: 'Who uses it (solo or a team)',
      environment: 'Where it runs and whether it needs network',
      privacy: 'Data sensitivity and restrictions',
      volume: 'Data volume (rows / file size)',
      frequency: 'How often and how long (usage rhythm)',
      pain: 'How it is done today (pain baseline)',
      reference: 'Reference or sample (nice to have)',
      delivery: 'How it is delivered and reopened',
      arch: '32-bit or 64-bit (will it run on their machine)',
    },
    spotWhy: {
      goal: 'Without this line, nothing else has an anchor and the AI can only guess what you are after.',
      'scope-out': 'Without boundaries the AI tends to add features you never asked for, which is expensive to undo.',
      done: 'Without a verifiable finish line you cannot tell whether the result is right — only how it feels.',
      input: 'If the input format is vague the usual outcome is "it runs but reads the data wrong", and that is hard to notice.',
      output: 'The output shape decides both the implementation and how you will use it; missing it often forces a UI redo.',
      'error-case': 'Describing only the happy path leaves the program helpless on missing columns, corrupt files, or mismatched totals.',
      operator: 'Solo and team use are built completely differently (accounts, network, where data lives).',
      environment: 'This decides desktop app vs web page, and whether data may leave the machine.',
      privacy: 'With customer data, amounts, or identity information involved, leaving this out can create compliance problems.',
      volume: 'Dozens of rows and hundreds of thousands are written differently; a wrong guess yields a version that cannot cope.',
      frequency: 'Using it once and using it dozens of times a day demand different speed and automation.',
      pain: 'The current process is the only baseline for "did this actually get better", and it teaches the AI your real workflow.',
      reference: 'One real sample file or reference screen beats a hundred sentences of description.',
      delivery: 'This decides whether you get an exe, a folder, or a web page; without it you may receive something you cannot run.',
      arch: 'A 64-bit build will not run on a 32-bit system; when unsure, target the user\'s own machine — but say so explicitly.',
    },
    spotFix: {
      goal: 'Pattern: I want to build [what], in order to [solve which problem].',
      'scope-out': 'Pattern: This version will NOT do [feature]; it should also not [behavior].',
      done: 'Pattern: Run it on [which data] and see [which result] — that counts as success. Prefer numbers.',
      input: 'Pattern: Input is [how many] [which format] files in [where]; first row is headers; about [n] rows; columns are [...].',
      output: 'Pattern: On screen show [what]; generate a [format] file named [pattern], saved to [which folder].',
      'error-case': 'Pattern: If [situation], it should [skip / highlight / stop and ask me].',
      operator: 'Pattern: Only me / me and [n] colleagues / external people too.',
      environment: 'Pattern: Open it on [which system] by [how]; does it need network; may data be uploaded.',
      privacy: 'Pattern: Data [may / may not] be uploaded; it must never touch [these files/folders].',
      volume: 'Pattern: Each run handles about [n rows / n records / size].',
      frequency: 'Pattern: I use it [daily/weekly], [n] times, about [n minutes] each time.',
      pain: 'Pattern: Today I do it by [manual steps], taking about [how long], and mistakes happen at [where].',
      reference: 'Pattern: I put a sample at [path]; the UI should resemble [some app].',
      delivery: 'Pattern: Give me [an exe / a folder with a file to double-click]; put it on the desktop.',
      arch: 'Pattern: It runs on [Windows / macOS / Linux] [32-bit / 64-bit]; if unsure, follow my own machine.',
    },
  },
}

/** 取某个语言的文案；语言不认识时退回 zh-CN */
export function stringsFor(locale) {
  return STRINGS[locale] || STRINGS['zh-CN']
}

/** 简单模板替换：{name} → 值 */
export function fmt(template, vars) {
  return String(template).replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] === undefined ? `{${k}}` : String(vars[k])
  )
}
