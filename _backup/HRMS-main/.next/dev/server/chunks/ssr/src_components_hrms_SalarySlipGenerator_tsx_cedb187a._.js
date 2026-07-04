module.exports = [
"[project]/src/components/hrms/SalarySlipGenerator.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SalarySlipGenerator",
    ()=>SalarySlipGenerator
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/file-text.js [app-ssr] (ecmascript) <export default as FileText>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$printer$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Printer$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/printer.js [app-ssr] (ecmascript) <export default as Printer>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$spreadsheet$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__FileSpreadsheet$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/file-spreadsheet.js [app-ssr] (ecmascript) <export default as FileSpreadsheet>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/card.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/button.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/select.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/store.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/sonner/dist/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2d$js$2d$style$2f$dist$2f$xlsx$2e$min$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/xlsx-js-style/dist/xlsx.min.js [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
;
;
;
;
;
// ── Advance Section Component ──
function AdvanceSection({ employeeId, month, year, advanceDeduction }) {
    const [advances, setAdvances] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        fetch(`/api/advances?employeeId=${employeeId}&month=${month}&year=${year}`).then((res)=>res.json()).then((data)=>setAdvances(data)).catch(()=>{});
    }, [
        employeeId,
        month,
        year
    ]);
    if (advances.length === 0) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "mx-5 mb-3 border border-amber-300/30 rounded-lg overflow-hidden",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-amber-500/10 px-4 py-2 border-b border-amber-300/20",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-xs font-bold text-amber-700 dark:text-amber-400",
                    children: "Advance Details"
                }, void 0, false, {
                    fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                    lineNumber: 31,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                lineNumber: 30,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "px-4 py-2 space-y-1.5",
                children: [
                    advances.map((adv, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center justify-between text-xs",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-muted-foreground",
                                            children: [
                                                "#",
                                                idx + 1
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                            lineNumber: 37,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: adv.reason
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                            lineNumber: 38,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-muted-foreground",
                                            children: [
                                                "(",
                                                new Date(adv.date).toLocaleDateString('en-IN'),
                                                ")"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                            lineNumber: 39,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                    lineNumber: 36,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "font-bold text-amber-600 dark:text-amber-400",
                                    children: [
                                        "₹",
                                        Number(adv.amount).toLocaleString('en-IN')
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                    lineNumber: 41,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, adv.id, true, {
                            fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                            lineNumber: 35,
                            columnNumber: 11
                        }, this)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center justify-between text-xs border-t border-amber-200/20 pt-1.5 mt-1.5",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-semibold",
                                children: "Total Advance Deducted"
                            }, void 0, false, {
                                fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                lineNumber: 45,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-bold text-amber-700 dark:text-amber-400",
                                children: [
                                    "₹",
                                    advanceDeduction.toLocaleString('en-IN')
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                lineNumber: 46,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                        lineNumber: 44,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                lineNumber: 33,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
        lineNumber: 29,
        columnNumber: 5
    }, this);
}
const FIRM_BADGE_CLASS = {
    LAPL: 'firm-badge-lapl',
    LRSL: 'firm-badge-lrsl',
    SI: 'firm-badge-si',
    SDF: 'firm-badge-sdf'
};
const FIRM_NAMES = {
    LAPL: 'LAXREE AMENITIES PVT LTD',
    LRSL: 'LAXREE ROOFING SOLUTION',
    SI: 'SMARTH INTERNATIONAL',
    SDF: 'SANGRAH DECOR & FURNITURE'
};
const FIRM_LOGOS = {
    LAPL: '/logos/lapl.jpg',
    LRSL: '/logos/lrsl.jpg',
    SI: '/logos/si.png',
    SDF: '/logos/sdf.png'
};
const FIRM_ADDRESSES = {
    LAPL: 'Plot No. 1 & 2, Harbilas Sharda Marg, Civil Lines, Ajmer, Rajasthan 305001',
    LRSL: 'Plot No. 1 & 2, Harbilas Sharda Marg, Civil Lines, Ajmer, Rajasthan 305001',
    SI: 'Plot No. 1 & 2, Harbilas Sharda Marg, Civil Lines, Ajmer, Rajasthan 305001',
    SDF: 'Plot No. 1 & 2, Harbilas Sharda Marg, Civil Lines, Ajmer, Rajasthan 305001'
};
const FIRM_PHONES = {
    LAPL: '+919251683663',
    LRSL: '+919251683663',
    SI: '+919251683663',
    SDF: '+919251683663'
};
const FIRM_EMAILS = {
    LAPL: 'hr@laxree.com',
    LRSL: 'hr@laxrereoofing.com',
    SI: 'hr@smarthinternational.com',
    SDF: 'hr@sangrahdecor.com'
};
// ── Convert decimal hours to HH.MM display format ──
function formatHours(decimal) {
    if (!decimal || decimal === 0) return '0.00';
    const hours = Math.floor(decimal);
    const minutes = Math.round((decimal - hours) * 60);
    if (minutes >= 60) return `${hours + 1}.00`;
    return `${hours}.${String(minutes).padStart(2, '0')}`;
}
// ── Display a value that's already in HH.MM format (e.g., 5.25 = 5h 25min) ──
function displayHHMM(value) {
    if (!value && value !== 0) return '0.00';
    return value.toFixed(2);
}
// ── Get firm code from employee ID prefix ──
function getFirmFromEmployeeId(employeeId) {
    const id = employeeId.toUpperCase();
    if (id.startsWith('LAPL')) return 'LAPL';
    if (id.startsWith('LRSL')) return 'LRSL';
    if (id.startsWith('SI-') || id.startsWith('SI0')) return 'SI';
    if (id.startsWith('SDF')) return 'SDF';
    return '';
}
function FirmBadge({ f }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: FIRM_BADGE_CLASS[f] || 'firm-badge-lapl',
        children: f
    }, void 0, false, {
        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
        lineNumber: 121,
        columnNumber: 10
    }, this);
}
// ── Convert number to words (Indian format) ──
function numberToWords(num) {
    if (num === 0) return 'Zero';
    const ones = [
        '',
        'One',
        'Two',
        'Three',
        'Four',
        'Five',
        'Six',
        'Seven',
        'Eight',
        'Nine',
        'Ten',
        'Eleven',
        'Twelve',
        'Thirteen',
        'Fourteen',
        'Fifteen',
        'Sixteen',
        'Seventeen',
        'Eighteen',
        'Nineteen'
    ];
    const tens = [
        '',
        '',
        'Twenty',
        'Thirty',
        'Forty',
        'Fifty',
        'Sixty',
        'Seventy',
        'Eighty',
        'Ninety'
    ];
    function convert(n) {
        if (n < 20) return ones[n];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
        if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convert(n % 100) : '');
        if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
        if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
        return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
    }
    const rupees = Math.floor(num);
    const paise = Math.round((num - rupees) * 100);
    let result = 'Rupees ' + convert(rupees);
    if (paise > 0) result += ' and ' + convert(paise) + ' Paise';
    result += ' Only';
    return result;
}
function SalarySlipGenerator() {
    const { selectedEmployeeId } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useHRMSStore"])();
    const [employeeId, setEmployeeId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(selectedEmployeeId || '');
    const [employees, setEmployees] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [month, setMonth] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(new Date().getMonth() + 1);
    const [year, setYear] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(new Date().getFullYear());
    const [slip, setSlip] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [firms, setFirms] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const slipRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const loadEmployees = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        const data = await (await fetch('/api/employees')).json();
        setEmployees(data);
    }, []);
    const loadFirms = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        try {
            const res = await fetch('/api/firms');
            if (res.ok) {
                const data = await res.json();
                setFirms(data);
            }
        } catch  {}
    }, []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        loadEmployees();
        loadFirms();
    }, [
        loadEmployees,
        loadFirms
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (selectedEmployeeId) setEmployeeId(selectedEmployeeId);
    }, [
        selectedEmployeeId
    ]);
    const loadSlip = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        if (!employeeId) return;
        const [empRes, payRes] = await Promise.all([
            fetch(`/api/employees/${employeeId}`),
            fetch(`/api/payroll?employeeId=${employeeId}&month=${month}&year=${year}`)
        ]);
        const empData = await empRes.json();
        const payData = await payRes.json();
        setSlip({
            employee: empData,
            payroll: payData[0] || null
        });
    }, [
        employeeId,
        month,
        year
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        loadSlip();
    }, [
        loadSlip
    ]);
    const months = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December'
    ];
    // Get firm details for the employee
    const firmCode = (slip?.employee?.employeeId ? getFirmFromEmployeeId(slip.employee.employeeId) : '') || slip?.employee?.department || slip?.employee?.firm || '';
    const firmDetails = firms.find((f)=>f.code === firmCode);
    const firmFullName = FIRM_NAMES[firmCode] || firmDetails?.name || 'Laxree Group of Companies';
    const firmAddress = FIRM_ADDRESSES[firmCode] || firmDetails?.address || '';
    const firmPhone = FIRM_PHONES[firmCode] || firmDetails?.contactPhone || '+919251683663';
    const firmEmail = FIRM_EMAILS[firmCode] || firmDetails?.contactEmail || 'hr@laxree.com';
    const firmLogo = FIRM_LOGOS[firmCode] || '/laxree-logo.png';
    // ── Professional Excel Export (Beautiful & Colorful — Matching Payslip Format) ──
    const handleExportExcel = ()=>{
        if (!slip?.payroll) return;
        const p = slip.payroll;
        const e = slip.employee;
        const perDayRate = p.perDayRate || p.monthlySalary / new Date(year, month, 0).getDate();
        const baseSalary = p.baseSalary != null ? p.baseSalary : Math.round(perDayRate * ((p.presentDays || 0) + (p.paidLeaves || 0))) * 100 / 100;
        const sundayEarn = p.sundayEarnings || 0;
        const totalEarnings = p.grossSalary + (p.bonus || 0) + (p.incentive || 0) + (p.arrear || 0);
        // Color constants
        const BLUE = '1E3A5F';
        const LIGHT_BLUE = 'DBEAFE';
        const WHITE = 'FFFFFF';
        const BLACK = '1A1A1A';
        const EMERALD = '059669';
        const RED = 'DC2626';
        const GOLD = 'D4A843';
        const TEAL = '0D9488';
        const LIGHT_GREEN = 'ECFDF5';
        const LIGHT_RED = 'FEF2F2';
        const LIGHT_GOLD = 'FFF8E7';
        const fullBorder = (color = 'B0B0B0', style = 'thin')=>({
                top: {
                    style,
                    color: {
                        rgb: color
                    }
                },
                bottom: {
                    style,
                    color: {
                        rgb: color
                    }
                },
                left: {
                    style,
                    color: {
                        rgb: color
                    }
                },
                right: {
                    style,
                    color: {
                        rgb: color
                    }
                }
            });
        const wb = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2d$js$2d$style$2f$dist$2f$xlsx$2e$min$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["utils"].book_new();
        // ── Payslip Sheet in the exact format user wants ──
        const data = [
            // Row 1: Title
            [
                firmFullName + ' — PAY SLIP'
            ],
            // Row 2: Company Information Header
            [
                'Salary Slip',
                '',
                '',
                '',
                'COMPANY LOGO'
            ],
            // Row 3: Company Info section header
            [
                'Company Information',
                '',
                '',
                '',
                ''
            ],
            // Rows 4-7: Company details
            [
                'Company Name :',
                firmFullName,
                '',
                '',
                ''
            ],
            [
                'Company Address :',
                firmAddress,
                '',
                '',
                ''
            ],
            [
                'Company Phone no :',
                firmPhone,
                '',
                '',
                ''
            ],
            [
                'Company Email Address :',
                firmEmail,
                '',
                '',
                ''
            ],
            // Row 8: Employee Information header
            [
                'Employee Information',
                '',
                '',
                '',
                ''
            ],
            // Rows 9-16: Employee details
            [
                'Employee Name :',
                e.fullName,
                '',
                'Employee Code :',
                e.employeeId
            ],
            [
                'Designation :',
                e.designation || 'N/A',
                '',
                'Department :',
                e.department || firmCode || 'N/A'
            ],
            [
                'Pay Period :',
                `${months[month - 1]} ${year}`,
                '',
                'Location :',
                e.location || 'N/A'
            ],
            [
                'Employee Address :',
                e.address || e.location || 'N/A',
                '',
                '',
                ''
            ],
            [
                'Employee Phone no :',
                e.mobile || 'N/A',
                '',
                'Employee Email ID :',
                e.email || 'N/A'
            ],
            // Row 14: blank
            [],
            // Row 15: Earnings/Deductions header
            [
                'Earnings',
                'Amount',
                '',
                'Deductions',
                'Amount'
            ],
            // Rows 16-24: Earnings & Deductions rows
            [
                'Basic',
                baseSalary.toLocaleString('en-IN'),
                '',
                'Provident Fund',
                '0'
            ],
            [
                'Sunday Earnings',
                sundayEarn.toLocaleString('en-IN'),
                '',
                'ESI',
                '0'
            ],
            [
                'Special Allowance',
                '0',
                '',
                'Professional Tax',
                '0'
            ],
            [
                'Gross Salary',
                p.grossSalary.toLocaleString('en-IN'),
                '',
                'Salary Advance',
                (p.advanceDeduction || 0).toLocaleString('en-IN')
            ],
            [
                'Other Earnings',
                (p.arrear || 0).toLocaleString('en-IN'),
                '',
                'TDS',
                (p.tdsDeduction || 0).toLocaleString('en-IN')
            ],
            [
                'Incentives',
                (p.incentive || 0).toLocaleString('en-IN'),
                '',
                'Loan',
                (p.loanDeduction || 0).toLocaleString('en-IN')
            ],
            [
                'Bonus',
                (p.bonus || 0).toLocaleString('en-IN'),
                '',
                'Security Deposit',
                (p.securityDeposit || 0).toLocaleString('en-IN')
            ],
            [
                'Over Time Pay',
                (p.otAmount || 0).toLocaleString('en-IN'),
                '',
                'Other Deduction',
                (p.otherDeductions || 0).toLocaleString('en-IN')
            ],
            [
                'Total Earnings',
                totalEarnings.toLocaleString('en-IN'),
                '',
                'Net Pay',
                p.netSalary.toLocaleString('en-IN')
            ],
            // Row 25: blank
            [],
            // Row 26: In Words
            [
                'In Words :',
                numberToWords(p.netSalary),
                '',
                '',
                ''
            ],
            // Row 27: blank
            [],
            // Row 28: Signature section
            [
                'Prepared By :',
                '',
                '',
                'Received By :',
                ''
            ],
            // Row 29: blank
            [],
            // Row 30: Footer
            [
                `This is a computer-generated payslip by ${firmFullName}`
            ]
        ];
        const ws = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2d$js$2d$style$2f$dist$2f$xlsx$2e$min$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["utils"].aoa_to_sheet(data);
        const cols5 = [
            'A',
            'B',
            'C',
            'D',
            'E'
        ];
        // Row 1: Title
        cols5.forEach((c)=>{
            if (ws[`${c}1`]) ws[`${c}1`].s = {
                font: {
                    bold: true,
                    color: {
                        rgb: BLACK
                    },
                    sz: 18
                },
                alignment: {
                    horizontal: 'center'
                },
                border: fullBorder(BLACK, 'medium')
            };
        });
        // Row 2: Salary Slip / Company Logo
        if (ws['A2']) ws['A2'].s = {
            font: {
                bold: true,
                color: {
                    rgb: WHITE
                },
                sz: 14
            },
            fill: {
                fgColor: {
                    rgb: BLUE
                }
            },
            alignment: {
                horizontal: 'center'
            },
            border: fullBorder(BLUE, 'medium')
        };
        if (ws['B2']) ws['B2'].s = {
            font: {
                bold: true,
                color: {
                    rgb: WHITE
                },
                sz: 14
            },
            fill: {
                fgColor: {
                    rgb: BLUE
                }
            },
            border: fullBorder(BLUE, 'medium')
        };
        if (ws['D2']) ws['D2'].s = {
            font: {
                bold: true,
                color: {
                    rgb: WHITE
                },
                sz: 10
            },
            fill: {
                fgColor: {
                    rgb: BLUE
                }
            },
            alignment: {
                horizontal: 'center'
            },
            border: fullBorder(BLUE, 'medium')
        };
        if (ws['E2']) ws['E2'].s = {
            font: {
                bold: true,
                color: {
                    rgb: WHITE
                },
                sz: 10
            },
            fill: {
                fgColor: {
                    rgb: BLUE
                }
            },
            alignment: {
                horizontal: 'center'
            },
            border: fullBorder(BLUE, 'medium')
        };
        // Row 3: Company Information section header
        cols5.forEach((c)=>{
            if (ws[`${c}3`]) ws[`${c}3`].s = {
                font: {
                    bold: true,
                    color: {
                        rgb: WHITE
                    },
                    sz: 11
                },
                fill: {
                    fgColor: {
                        rgb: BLUE
                    }
                },
                border: fullBorder(BLUE)
            };
        });
        // Rows 4-7: Company details (light blue background)
        for (const r of [
            4,
            5,
            6,
            7
        ]){
            if (ws[`A${r}`]) ws[`A${r}`].s = {
                font: {
                    bold: true,
                    sz: 10,
                    color: {
                        rgb: BLACK
                    }
                },
                fill: {
                    fgColor: {
                        rgb: LIGHT_BLUE
                    }
                },
                border: fullBorder('90B8E0')
            };
            if (ws[`B${r}`]) ws[`B${r}`].s = {
                font: {
                    sz: 10
                },
                fill: {
                    fgColor: {
                        rgb: LIGHT_BLUE
                    }
                },
                border: fullBorder('90B8E0')
            };
        }
        // Row 8: Employee Information header
        cols5.forEach((c)=>{
            if (ws[`${c}8`]) ws[`${c}8`].s = {
                font: {
                    bold: true,
                    color: {
                        rgb: BLACK
                    },
                    sz: 11
                },
                fill: {
                    fgColor: {
                        rgb: 'E8E8E8'
                    }
                },
                border: fullBorder('999999')
            };
        });
        // Rows 9-13: Employee details (white background)
        for (const r of [
            9,
            10,
            11,
            12,
            13
        ]){
            if (ws[`A${r}`]) ws[`A${r}`].s = {
                font: {
                    bold: true,
                    sz: 10,
                    color: {
                        rgb: BLACK
                    }
                },
                border: fullBorder('CCCCCC')
            };
            if (ws[`B${r}`]) ws[`B${r}`].s = {
                font: {
                    sz: 10
                },
                border: fullBorder('CCCCCC')
            };
            if (ws[`D${r}`]) ws[`D${r}`].s = {
                font: {
                    bold: true,
                    sz: 10,
                    color: {
                        rgb: BLACK
                    }
                },
                border: fullBorder('CCCCCC')
            };
            if (ws[`E${r}`]) ws[`E${r}`].s = {
                font: {
                    sz: 10
                },
                border: fullBorder('CCCCCC')
            };
        }
        // Row 15: Earnings/Deductions header
        if (ws['A15']) ws['A15'].s = {
            font: {
                bold: true,
                color: {
                    rgb: WHITE
                },
                sz: 11
            },
            fill: {
                fgColor: {
                    rgb: EMERALD
                }
            },
            alignment: {
                horizontal: 'center'
            },
            border: fullBorder(EMERALD, 'medium')
        };
        if (ws['B15']) ws['B15'].s = {
            font: {
                bold: true,
                color: {
                    rgb: WHITE
                },
                sz: 11
            },
            fill: {
                fgColor: {
                    rgb: EMERALD
                }
            },
            alignment: {
                horizontal: 'center'
            },
            border: fullBorder(EMERALD, 'medium')
        };
        if (ws['D15']) ws['D15'].s = {
            font: {
                bold: true,
                color: {
                    rgb: WHITE
                },
                sz: 11
            },
            fill: {
                fgColor: {
                    rgb: RED
                }
            },
            alignment: {
                horizontal: 'center'
            },
            border: fullBorder(RED, 'medium')
        };
        if (ws['E15']) ws['E15'].s = {
            font: {
                bold: true,
                color: {
                    rgb: WHITE
                },
                sz: 11
            },
            fill: {
                fgColor: {
                    rgb: RED
                }
            },
            alignment: {
                horizontal: 'center'
            },
            border: fullBorder(RED, 'medium')
        };
        // Rows 16-24: Earnings/Deductions data (alternating colors)
        for(let i = 0; i < 9; i++){
            const r = 16 + i;
            const isEven = i % 2 === 0;
            const earnBg = isEven ? LIGHT_GREEN : LIGHT_GOLD;
            const dedBg = isEven ? LIGHT_RED : 'FFF0F0';
            const isTotal = i === 8; // last row
            if (ws[`A${r}`]) ws[`A${r}`].s = {
                font: {
                    sz: 10,
                    bold: isTotal,
                    color: {
                        rgb: isTotal ? EMERALD : BLACK
                    }
                },
                fill: {
                    fgColor: {
                        rgb: earnBg
                    }
                },
                border: fullBorder(isTotal ? EMERALD : 'C0C0C0', isTotal ? 'medium' : 'thin')
            };
            if (ws[`B${r}`]) ws[`B${r}`].s = {
                font: {
                    sz: 10,
                    bold: isTotal,
                    color: {
                        rgb: isTotal ? EMERALD : BLACK
                    }
                },
                fill: {
                    fgColor: {
                        rgb: earnBg
                    }
                },
                alignment: {
                    horizontal: 'right'
                },
                border: fullBorder(isTotal ? EMERALD : 'C0C0C0', isTotal ? 'medium' : 'thin')
            };
            if (ws[`D${r}`]) ws[`D${r}`].s = {
                font: {
                    sz: 10,
                    bold: isTotal,
                    color: {
                        rgb: isTotal ? RED : BLACK
                    }
                },
                fill: {
                    fgColor: {
                        rgb: dedBg
                    }
                },
                border: fullBorder(isTotal ? RED : 'C0C0C0', isTotal ? 'medium' : 'thin')
            };
            if (ws[`E${r}`]) ws[`E${r}`].s = {
                font: {
                    sz: 10,
                    bold: isTotal,
                    color: {
                        rgb: isTotal ? RED : BLACK
                    }
                },
                fill: {
                    fgColor: {
                        rgb: dedBg
                    }
                },
                alignment: {
                    horizontal: 'right'
                },
                border: fullBorder(isTotal ? RED : 'C0C0C0', isTotal ? 'medium' : 'thin')
            };
        }
        // Row 26: In Words (blue bg)
        if (ws['A26']) ws['A26'].s = {
            font: {
                bold: true,
                sz: 10,
                color: {
                    rgb: BLUE
                }
            },
            fill: {
                fgColor: {
                    rgb: LIGHT_BLUE
                }
            },
            border: fullBorder(BLUE)
        };
        if (ws['B26']) ws['B26'].s = {
            font: {
                italic: true,
                sz: 10,
                color: {
                    rgb: BLUE
                }
            },
            fill: {
                fgColor: {
                    rgb: LIGHT_BLUE
                }
            },
            border: fullBorder(BLUE)
        };
        // Row 28: Signature section (blue bg)
        cols5.forEach((c)=>{
            if (ws[`${c}28`]) ws[`${c}28`].s = {
                font: {
                    bold: true,
                    sz: 10,
                    color: {
                        rgb: WHITE
                    }
                },
                fill: {
                    fgColor: {
                        rgb: BLUE
                    }
                },
                border: fullBorder(BLUE)
            };
        });
        // Rows 30-31: Footer
        cols5.forEach((c)=>{
            if (ws[`${c}30`]) ws[`${c}30`].s = {
                font: {
                    italic: true,
                    sz: 8,
                    color: {
                        rgb: '888888'
                    }
                }
            };
        });
        cols5.forEach((c)=>{
            if (ws[`${c}31`]) ws[`${c}31`].s = {
                font: {
                    italic: true,
                    sz: 8,
                    color: {
                        rgb: '888888'
                    }
                }
            };
        });
        ws['!cols'] = [
            {
                wch: 22
            },
            {
                wch: 28
            },
            {
                wch: 4
            },
            {
                wch: 22
            },
            {
                wch: 28
            }
        ];
        ws['!merges'] = [
            {
                s: {
                    r: 0,
                    c: 0
                },
                e: {
                    r: 0,
                    c: 4
                }
            },
            {
                s: {
                    r: 1,
                    c: 0
                },
                e: {
                    r: 1,
                    c: 1
                }
            },
            {
                s: {
                    r: 1,
                    c: 3
                },
                e: {
                    r: 1,
                    c: 4
                }
            },
            {
                s: {
                    r: 2,
                    c: 0
                },
                e: {
                    r: 2,
                    c: 4
                }
            },
            {
                s: {
                    r: 3,
                    c: 1
                },
                e: {
                    r: 3,
                    c: 4
                }
            },
            {
                s: {
                    r: 4,
                    c: 1
                },
                e: {
                    r: 4,
                    c: 4
                }
            },
            {
                s: {
                    r: 5,
                    c: 1
                },
                e: {
                    r: 5,
                    c: 4
                }
            },
            {
                s: {
                    r: 6,
                    c: 1
                },
                e: {
                    r: 6,
                    c: 4
                }
            },
            {
                s: {
                    r: 7,
                    c: 0
                },
                e: {
                    r: 7,
                    c: 4
                }
            },
            {
                s: {
                    r: 11,
                    c: 1
                },
                e: {
                    r: 11,
                    c: 4
                }
            },
            {
                s: {
                    r: 14,
                    c: 2
                },
                e: {
                    r: 14,
                    c: 2
                }
            },
            {
                s: {
                    r: 25,
                    c: 1
                },
                e: {
                    r: 25,
                    c: 4
                }
            },
            {
                s: {
                    r: 29,
                    c: 0
                },
                e: {
                    r: 29,
                    c: 4
                }
            },
            {
                s: {
                    r: 30,
                    c: 0
                },
                e: {
                    r: 30,
                    c: 4
                }
            }
        ];
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2d$js$2d$style$2f$dist$2f$xlsx$2e$min$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["utils"].book_append_sheet(wb, ws, 'Salary Slip');
        // ── Sheet 2: Detailed Breakdown ──
        const detailData = [
            [
                firmFullName
            ],
            [
                'SALARY BREAKDOWN — ' + months[month - 1] + ' ' + year
            ],
            [],
            [
                'Employee Details'
            ],
            [
                'Name',
                e.fullName,
                '',
                'Code',
                e.employeeId
            ],
            [
                'Company',
                `${firmCode} - ${firmFullName}`,
                '',
                'Location',
                e.location || 'N/A'
            ],
            [
                'Designation',
                e.designation || 'N/A',
                '',
                'Salary Type',
                (e.salaryType || 'hourly').charAt(0).toUpperCase() + (e.salaryType || 'hourly').slice(1)
            ],
            [],
            [
                'Earnings & Deductions Summary'
            ],
            [
                'Monthly Salary',
                p.monthlySalary.toLocaleString('en-IN'),
                '',
                'Days in Month',
                new Date(year, month, 0).getDate()
            ],
            [
                'Base Salary',
                baseSalary.toLocaleString('en-IN'),
                '',
                'Present Days',
                p.presentDays || 0
            ],
            [
                'Absent Days',
                (p.absentDays || 0).toString(),
                '',
                'Gross Salary',
                p.grossSalary.toLocaleString('en-IN')
            ],
            [],
            [
                'Hours Breakdown'
            ],
            [
                'Total Worked Hrs',
                displayHHMM(p.totalWorkedHrs || 0),
                '',
                'OT Hours',
                displayHHMM(p.otHours || 0)
            ],
            [
                'Sunday Earnings',
                (p.sundayEarnings || 0).toLocaleString('en-IN'),
                '',
                'Earn Sunday Hrs',
                (p.earnedSundayHrs || (p.sundayCount || 0) * 9).toFixed(0) + 'h'
            ],
            [
                'Sunday Worked Hrs',
                displayHHMM(p.sundayHrs || 0),
                '',
                'OT Amount',
                (p.otAmount || 0).toLocaleString('en-IN')
            ]
        ];
        const ws2 = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2d$js$2d$style$2f$dist$2f$xlsx$2e$min$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["utils"].aoa_to_sheet(detailData);
        const cols = [
            'A',
            'B',
            'C',
            'D',
            'E'
        ];
        // Style
        cols.forEach((c)=>{
            if (ws2[`${c}1`]) ws2[`${c}1`].s = {
                font: {
                    bold: true,
                    color: {
                        rgb: GOLD
                    },
                    sz: 14
                },
                fill: {
                    fgColor: {
                        rgb: BLACK
                    }
                },
                alignment: {
                    horizontal: 'center'
                },
                border: fullBorder(GOLD, 'medium')
            };
        });
        cols.forEach((c)=>{
            if (ws2[`${c}2`]) ws2[`${c}2`].s = {
                font: {
                    bold: true,
                    color: {
                        rgb: WHITE
                    },
                    sz: 11
                },
                fill: {
                    fgColor: {
                        rgb: BLUE
                    }
                },
                alignment: {
                    horizontal: 'center'
                },
                border: fullBorder(BLUE)
            };
        });
        [
            'A',
            'D'
        ].forEach((c)=>{
            if (ws2[`${c}4`]) ws2[`${c}4`].s = {
                font: {
                    bold: true,
                    color: {
                        rgb: GOLD
                    },
                    sz: 10
                },
                fill: {
                    fgColor: {
                        rgb: '2D2D2D'
                    }
                }
            };
        });
        for (const r of [
            5,
            6,
            7
        ]){
            if (ws2[`A${r}`]) ws2[`A${r}`].s = {
                font: {
                    sz: 10,
                    color: {
                        rgb: '666666'
                    }
                }
            };
            if (ws2[`B${r}`]) ws2[`B${r}`].s = {
                font: {
                    bold: true,
                    sz: 10
                },
                fill: {
                    fgColor: {
                        rgb: LIGHT_GOLD
                    }
                }
            };
            if (ws2[`D${r}`]) ws2[`D${r}`].s = {
                font: {
                    sz: 10,
                    color: {
                        rgb: '666666'
                    }
                }
            };
            if (ws2[`E${r}`]) ws2[`E${r}`].s = {
                font: {
                    bold: true,
                    sz: 10
                },
                fill: {
                    fgColor: {
                        rgb: LIGHT_GOLD
                    }
                }
            };
        }
        [
            'A',
            'D'
        ].forEach((c)=>{
            if (ws2[`${c}9`]) ws2[`${c}9`].s = {
                font: {
                    bold: true,
                    color: {
                        rgb: GOLD
                    },
                    sz: 10
                },
                fill: {
                    fgColor: {
                        rgb: '2D2D2D'
                    }
                }
            };
        });
        for (const r of [
            10,
            11,
            12,
            13
        ]){
            if (ws2[`A${r}`]) ws2[`A${r}`].s = {
                font: {
                    sz: 10,
                    color: {
                        rgb: '666666'
                    }
                }
            };
            if (ws2[`B${r}`]) ws2[`B${r}`].s = {
                font: {
                    bold: true,
                    sz: 10
                },
                fill: {
                    fgColor: {
                        rgb: LIGHT_BLUE
                    }
                }
            };
            if (ws2[`D${r}`]) ws2[`D${r}`].s = {
                font: {
                    sz: 10,
                    color: {
                        rgb: '666666'
                    }
                }
            };
            if (ws2[`E${r}`]) ws2[`E${r}`].s = {
                font: {
                    bold: true,
                    sz: 10
                },
                fill: {
                    fgColor: {
                        rgb: LIGHT_BLUE
                    }
                }
            };
        }
        [
            'A',
            'D'
        ].forEach((c)=>{
            if (ws2[`${c}15`]) ws2[`${c}15`].s = {
                font: {
                    bold: true,
                    color: {
                        rgb: GOLD
                    },
                    sz: 10
                },
                fill: {
                    fgColor: {
                        rgb: '2D2D2D'
                    }
                }
            };
        });
        for (const r of [
            16,
            17,
            18
        ]){
            if (ws2[`A${r}`]) ws2[`A${r}`].s = {
                font: {
                    sz: 10,
                    color: {
                        rgb: '666666'
                    }
                }
            };
            if (ws2[`B${r}`]) ws2[`B${r}`].s = {
                font: {
                    bold: true,
                    sz: 10
                },
                fill: {
                    fgColor: {
                        rgb: LIGHT_GOLD
                    }
                }
            };
            if (ws2[`D${r}`]) ws2[`D${r}`].s = {
                font: {
                    sz: 10,
                    color: {
                        rgb: '666666'
                    }
                }
            };
            if (ws2[`E${r}`]) ws2[`E${r}`].s = {
                font: {
                    bold: true,
                    sz: 10
                },
                fill: {
                    fgColor: {
                        rgb: LIGHT_GOLD
                    }
                }
            };
        }
        ws2['!cols'] = [
            {
                wch: 32
            },
            {
                wch: 22
            },
            {
                wch: 4
            },
            {
                wch: 22
            },
            {
                wch: 22
            }
        ];
        ws2['!merges'] = [
            {
                s: {
                    r: 0,
                    c: 0
                },
                e: {
                    r: 0,
                    c: 4
                }
            },
            {
                s: {
                    r: 1,
                    c: 0
                },
                e: {
                    r: 1,
                    c: 4
                }
            }
        ];
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2d$js$2d$style$2f$dist$2f$xlsx$2e$min$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["utils"].book_append_sheet(wb, ws2, 'Breakdown');
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2d$js$2d$style$2f$dist$2f$xlsx$2e$min$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["writeFile"](wb, `Payslip_${e.fullName}_${months[month - 1]}_${year}.xlsx`);
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success('Payslip Excel downloaded successfully!');
    };
    // ── Print Handler (Professional Blue-White Format matching user's desired layout) ──
    const handlePrint = ()=>{
        if (!slip?.payroll || !slipRef.current) return;
        const p = slip.payroll;
        const e = slip.employee;
        const perDayRate = p.perDayRate || p.monthlySalary / new Date(year, month, 0).getDate();
        const baseSalary = p.baseSalary != null ? p.baseSalary : Math.round(perDayRate * ((p.presentDays || 0) + (p.paidLeaves || 0))) * 100 / 100;
        const sundayEarn = p.sundayEarnings || 0;
        const totalEarnings = p.grossSalary + (p.bonus || 0) + (p.incentive || 0) + (p.arrear || 0);
        const logoAbsUrl = `${window.location.origin}${firmLogo}`;
        const printWin = window.open('', '_blank', 'width=800,height=1000');
        if (!printWin) return;
        printWin.document.write(`<!DOCTYPE html><html><head><title>Salary Slip - ${e.fullName}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700;900&display=swap');
      @page { size: A4; margin: 10mm; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Merriweather', 'Georgia', 'Liberation Serif', serif; font-size: 11px; color: #222; background: #fff; }
      .payslip { max-width: 750px; margin: 0 auto; border: 2px solid #1E3A5F; border-radius: 8px; overflow: hidden; }
      .title { text-align: center; font-size: 20px; font-weight: 800; padding: 10px; color: #1A1A1A; border-bottom: 2px solid #1E3A5F; }
      .company-header { background: #1E3A5F; color: white; padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; }
      .company-header .left h2 { font-size: 16px; font-weight: 700; margin-bottom: 2px; }
      .company-header .left p { font-size: 10px; color: #b0c4de; }
      .company-header .logo-box { width: 70px; height: 70px; background: white; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
      .company-header .logo-box img { width: 100%; height: 100%; object-fit: contain; }
      .section-header { background: #1E3A5F; color: white; padding: 6px 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
      .info-grid { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; padding: 10px 20px; background: #DBEAFE; }
      .info-grid .label { font-weight: 600; font-size: 10px; color: #1E3A5F; }
      .info-grid .value { font-size: 10px; }
      .emp-section { background: white; }
      .emp-section .info-grid { background: #f8f9fa; }
      .table-section { padding: 0; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #059669; color: white; font-size: 11px; font-weight: 700; padding: 8px 12px; text-align: left; }
      th.ded { background: #DC2626; }
      td { padding: 6px 12px; font-size: 10px; border-bottom: 1px solid #e5e7eb; }
      tr:nth-child(even) td { background: #ECFDF5; }
      tr:nth-child(even) td.ded-cell { background: #FEF2F2; }
      tr.total-row td { font-weight: 700; border-top: 2px solid #333; background: #f0fdf4 !important; font-size: 12px; }
      tr.total-row td.ded-cell { background: #fef2f2 !important; color: #DC2626; }
      tr.total-row td.earn-total { color: #059669; }
      .net-pay-row td { font-weight: 800; background: #FEF2F2 !important; color: #DC2626; font-size: 13px; border-top: 2px solid #DC2626; }
      .in-words { padding: 8px 20px; background: #DBEAFE; font-size: 10px; color: #1E3A5F; }
      .in-words .label { font-weight: 700; }
      .in-words .value { font-style: italic; }
      .signature-section { background: #1E3A5F; color: white; padding: 12px 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
      .sig-line { border-top: 1px solid white; padding-top: 4px; text-align: center; font-size: 9px; margin-top: 20px; }
      .footer { padding: 6px 20px; text-align: center; font-size: 8px; color: #999; border-top: 1px solid #eee; }
    </style></head><body>
    <div class="payslip">
      <div class="title">PAY SLIP — ${months[month - 1]} ${year}</div>
      <div class="company-header">
        <div class="left">
          <h2>Salary Slip</h2>
          <p>${firmFullName}</p>
        </div>
        <div class="logo-box"><img src="${logoAbsUrl}" alt="${firmCode}" /></div>
      </div>
      <div class="info-grid">
        <span class="label">Company Name :</span><span class="value">${firmFullName}</span>
        <span class="label">Company Address :</span><span class="value">${firmAddress}</span>
        <span class="label">Company Phone no :</span><span class="value">${firmPhone}</span>
        <span class="label">Company Email Address :</span><span class="value">${firmEmail}</span>
      </div>
      <div class="section-header">Employee Information</div>
      <div class="emp-section">
        <div class="info-grid">
          <span class="label">Employee Name :</span><span class="value">${e.fullName}</span>
          <span class="label">Employee Code :</span><span class="value">${e.employeeId}</span>
          <span class="label">Designation :</span><span class="value">${e.designation || 'N/A'}</span>
          <span class="label">Department :</span><span class="value">${e.department || firmCode || 'N/A'}</span>
          <span class="label">Pay Period :</span><span class="value">${months[month - 1]} ${year}</span>
          <span class="label">Location :</span><span class="value">${e.location || 'N/A'}</span>
          <span class="label">Employee Address :</span><span class="value">${e.address || e.location || 'N/A'}</span>
          <span class="label">Employee Phone no :</span><span class="value">${e.mobile || 'N/A'}</span>
          <span class="label">Employee Email ID :</span><span class="value">${e.email || 'N/A'}</span>
        </div>
      </div>
      <div class="table-section">
        <table>
          <tr><th>Earnings</th><th>Amount</th><th class="ded">Deductions</th><th class="ded">Amount</th></tr>
          <tr><td>Basic</td><td>₹${baseSalary.toLocaleString('en-IN')}</td><td class="ded-cell">Provident Fund</td><td class="ded-cell">₹0</td></tr>
          <tr><td>Sunday Earnings</td><td>₹${sundayEarn.toLocaleString('en-IN')}</td><td class="ded-cell">ESI</td><td class="ded-cell">₹0</td></tr>
          <tr><td>Special Allowance</td><td>₹0</td><td class="ded-cell">Professional Tax</td><td class="ded-cell">₹0</td></tr>
          <tr><td>Gross Salary</td><td>₹${p.grossSalary.toLocaleString('en-IN')}</td><td class="ded-cell">Salary Advance</td><td class="ded-cell">₹${(p.advanceDeduction || 0).toLocaleString('en-IN')}</td></tr>
          <tr><td>Other Earnings</td><td>₹${(p.arrear || 0).toLocaleString('en-IN')}</td><td class="ded-cell">TDS</td><td class="ded-cell">₹${(p.tdsDeduction || 0).toLocaleString('en-IN')}</td></tr>
          <tr><td>Incentives</td><td>₹${(p.incentive || 0).toLocaleString('en-IN')}</td><td class="ded-cell">Loan</td><td class="ded-cell">₹${(p.loanDeduction || 0).toLocaleString('en-IN')}</td></tr>
          <tr><td>Bonus</td><td>₹${(p.bonus || 0).toLocaleString('en-IN')}</td><td class="ded-cell">Security Deposit</td><td class="ded-cell">₹${(p.securityDeposit || 0).toLocaleString('en-IN')}</td></tr>
          <tr><td>Over Time Pay</td><td>₹${(p.otAmount || 0).toLocaleString('en-IN')}</td><td class="ded-cell">Other Deduction</td><td class="ded-cell">₹${(p.otherDeductions || 0).toLocaleString('en-IN')}</td></tr>
          <tr class="total-row"><td class="earn-total">Total Earnings</td><td class="earn-total">₹${totalEarnings.toLocaleString('en-IN')}</td><td class="ded-cell net-pay-label">Net Pay</td><td class="ded-cell" style="font-size:14px;font-weight:800;color:#1E3A5F;">₹${p.netSalary.toLocaleString('en-IN')}</td></tr>
        </table>
      </div>
      <div class="in-words">
        <span class="label">In Words : </span><span class="value">${numberToWords(p.netSalary)}</span>
      </div>
      <div class="signature-section">
        <div class="sig-line">Prepared By</div>
        <div class="sig-line">Received By</div>
      </div>
      <div class="footer">
        This is a computer-generated payslip by ${firmFullName}. For queries contact HR at ${firmPhone}
      </div>
    </div>
    <script>window.onload=function(){window.print();}</script>
    </body></html>`);
        printWin.document.close();
    };
    const firm = (slip?.employee?.employeeId ? getFirmFromEmployeeId(slip.employee.employeeId) : '') || slip?.employee?.department || slip?.employee?.firm || '';
    const p = slip?.payroll;
    const e = slip?.employee;
    const perDayRateCalc = p ? p.perDayRate || p.monthlySalary / new Date(year, month, 0).getDate() : 0;
    const baseSalaryCalc = p ? p.baseSalary != null ? p.baseSalary : Math.round(perDayRateCalc * ((p.presentDays || 0) + (p.paidLeaves || 0))) * 100 / 100 : 0;
    const sundayEarningsCalc = p ? p.sundayEarnings || 0 : 0;
    const sundayCountCalc = p ? p.sundayCount || 0 : 0;
    const earnedSundayHrsCalc = p ? p.earnedSundayHrs || sundayCountCalc * 9 : 0;
    const totalEarningsCalc = p ? p.grossSalary + (p.bonus || 0) + (p.incentive || 0) + (p.arrear || 0) : 0;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                initial: {
                    opacity: 0,
                    y: -10
                },
                animate: {
                    opacity: 1,
                    y: 0
                },
                className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "text-xl font-bold flex items-center gap-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__["FileText"], {
                                    className: "w-5 h-5 text-gold"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                    lineNumber: 565,
                                    columnNumber: 13
                                }, this),
                                "Salary Slip Generator"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                            lineNumber: 564,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-sm text-muted-foreground",
                            children: "Professional payslips with company branding"
                        }, void 0, false, {
                            fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                            lineNumber: 568,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                    lineNumber: 563,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                lineNumber: 558,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-wrap gap-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Select"], {
                        value: employeeId,
                        onValueChange: setEmployeeId,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SelectTrigger"], {
                                className: "w-64",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SelectValue"], {
                                    placeholder: "Select Employee"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                    lineNumber: 574,
                                    columnNumber: 43
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                lineNumber: 574,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SelectContent"], {
                                children: employees.map((emp)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SelectItem"], {
                                        value: emp.employeeId,
                                        children: [
                                            emp.fullName,
                                            " (",
                                            emp.employeeId,
                                            ")"
                                        ]
                                    }, emp.employeeId, true, {
                                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                        lineNumber: 575,
                                        columnNumber: 48
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                lineNumber: 575,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                        lineNumber: 573,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Select"], {
                        value: String(month),
                        onValueChange: (v)=>setMonth(Number(v)),
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SelectTrigger"], {
                                className: "w-36",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SelectValue"], {}, void 0, false, {
                                    fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                    lineNumber: 578,
                                    columnNumber: 43
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                lineNumber: 578,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SelectContent"], {
                                children: months.map((m, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SelectItem"], {
                                        value: String(i + 1),
                                        children: m
                                    }, i, false, {
                                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                        lineNumber: 579,
                                        columnNumber: 48
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                lineNumber: 579,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                        lineNumber: 577,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Select"], {
                        value: String(year),
                        onValueChange: (v)=>setYear(Number(v)),
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SelectTrigger"], {
                                className: "w-24",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SelectValue"], {}, void 0, false, {
                                    fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                    lineNumber: 582,
                                    columnNumber: 43
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                lineNumber: 582,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SelectContent"], {
                                children: [
                                    2024,
                                    2025,
                                    2026,
                                    2027
                                ].map((y)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$select$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SelectItem"], {
                                        value: String(y),
                                        children: y
                                    }, y, false, {
                                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                        lineNumber: 583,
                                        columnNumber: 61
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                lineNumber: 583,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                        lineNumber: 581,
                        columnNumber: 9
                    }, this),
                    slip?.payroll && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                variant: "outline",
                                onClick: handlePrint,
                                className: "gap-1.5",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$printer$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Printer$3e$__["Printer"], {
                                        className: "w-4 h-4"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                        lineNumber: 588,
                                        columnNumber: 15
                                    }, this),
                                    " Print Payslip"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                lineNumber: 587,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                className: "gradient-laxree text-white gap-1.5",
                                onClick: handleExportExcel,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$spreadsheet$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__FileSpreadsheet$3e$__["FileSpreadsheet"], {
                                        className: "w-4 h-4"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                        lineNumber: 591,
                                        columnNumber: 15
                                    }, this),
                                    " Export Excel"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                lineNumber: 590,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                        lineNumber: 586,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                lineNumber: 572,
                columnNumber: 7
            }, this),
            slip?.payroll ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                initial: {
                    opacity: 0,
                    y: 20
                },
                animate: {
                    opacity: 1,
                    y: 0
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Card"], {
                    className: "border-2 border-blue-900/30 dark:border-blue-500/20 overflow-hidden",
                    ref: slipRef,
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white dark:bg-card",
                        style: {
                            fontFamily: "'Merriweather', 'Georgia', 'Liberation Serif', serif"
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-center py-2 border-b-2 border-[#1E3A5F] dark:border-blue-500",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center justify-between px-4",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                            className: "text-xl font-extrabold text-[#1E3A5F] dark:text-blue-400 tracking-wide",
                                            children: "PAY SLIP"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                            lineNumber: 605,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-xs text-muted-foreground",
                                            children: [
                                                months[month - 1],
                                                " ",
                                                year
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                            lineNumber: 606,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                    lineNumber: 604,
                                    columnNumber: 17
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                lineNumber: 603,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "bg-[#1E3A5F] dark:bg-blue-900 px-5 py-3 flex items-center justify-between",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                className: "text-white font-bold text-base",
                                                children: firmFullName
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                                lineNumber: 613,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-blue-200 text-xs",
                                                children: [
                                                    months[month - 1],
                                                    " ",
                                                    year
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                                lineNumber: 614,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                        lineNumber: 612,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "w-16 h-16 bg-white rounded-lg overflow-hidden flex items-center justify-center p-1",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                            src: firmLogo,
                                            alt: firmCode,
                                            className: "w-full h-full object-contain"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                            lineNumber: 617,
                                            columnNumber: 19
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                        lineNumber: 616,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                lineNumber: 611,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 px-5 py-3 bg-blue-50 dark:bg-blue-950/30 text-sm",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-semibold text-[#1E3A5F] dark:text-blue-400",
                                        children: "Company Name :"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                        lineNumber: 623,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: firmFullName
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                        lineNumber: 624,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-semibold text-[#1E3A5F] dark:text-blue-400",
                                        children: "Company Address :"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                        lineNumber: 625,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: firmAddress
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                        lineNumber: 626,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-semibold text-[#1E3A5F] dark:text-blue-400",
                                        children: "Company Phone no :"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                        lineNumber: 627,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: firmPhone
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                        lineNumber: 628,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-semibold text-[#1E3A5F] dark:text-blue-400",
                                        children: "Company Email Address :"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                        lineNumber: 629,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: firmEmail
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                        lineNumber: 630,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                lineNumber: 622,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "bg-[#1E3A5F] dark:bg-blue-900 px-5 py-1.5",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "text-white font-bold text-xs uppercase tracking-wider",
                                    children: "Employee Information"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                    lineNumber: 635,
                                    columnNumber: 17
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                lineNumber: 634,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid grid-cols-[auto_1fr_auto_1fr] gap-x-3 gap-y-1 px-5 py-3 bg-gray-50 dark:bg-muted/20 text-sm",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-semibold text-[#1E3A5F] dark:text-blue-400",
                                        children: "Employee Name :"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                        lineNumber: 640,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: e.fullName
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                        lineNumber: 641,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-semibold text-[#1E3A5F] dark:text-blue-400",
                                        children: "Employee Code :"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                        lineNumber: 642,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: e.employeeId
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                        lineNumber: 643,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-semibold text-[#1E3A5F] dark:text-blue-400",
                                        children: "Designation :"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                        lineNumber: 644,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: e.designation || 'N/A'
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                        lineNumber: 645,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-semibold text-[#1E3A5F] dark:text-blue-400",
                                        children: "Department :"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                        lineNumber: 646,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: e.department || firmCode || 'N/A'
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                        lineNumber: 647,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-semibold text-[#1E3A5F] dark:text-blue-400",
                                        children: "Pay Period :"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                        lineNumber: 648,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: [
                                            months[month - 1],
                                            " ",
                                            year
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                        lineNumber: 649,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-semibold text-[#1E3A5F] dark:text-blue-400",
                                        children: "Location :"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                        lineNumber: 650,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: e.location || 'N/A'
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                        lineNumber: 651,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-semibold text-[#1E3A5F] dark:text-blue-400",
                                        children: "Employee Address :"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                        lineNumber: 652,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: e.address || e.location || 'N/A'
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                        lineNumber: 653,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-semibold text-[#1E3A5F] dark:text-blue-400",
                                        children: "Employee Phone no :"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                        lineNumber: 654,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: e.mobile || 'N/A'
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                        lineNumber: 655,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-semibold text-[#1E3A5F] dark:text-blue-400",
                                        children: "Employee Email ID :"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                        lineNumber: 656,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: e.email || 'N/A'
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                        lineNumber: 657,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                lineNumber: 639,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "px-5 py-3",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                    className: "w-full text-sm border-collapse",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "bg-emerald-600 text-white px-3 py-2 text-left font-bold",
                                                        children: "Earnings"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                                        lineNumber: 665,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "bg-emerald-600 text-white px-3 py-2 text-left font-bold",
                                                        children: "Amount"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                                        lineNumber: 666,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "bg-red-600 text-white px-3 py-2 text-left font-bold",
                                                        children: "Deductions"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                                        lineNumber: 667,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "bg-red-600 text-white px-3 py-2 text-left font-bold",
                                                        children: "Amount"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                                        lineNumber: 668,
                                                        columnNumber: 23
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                                lineNumber: 664,
                                                columnNumber: 21
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                            lineNumber: 663,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                            children: [
                                                [
                                                    {
                                                        earn: 'Basic',
                                                        earnVal: baseSalaryCalc,
                                                        ded: 'Provident Fund',
                                                        dedVal: 0
                                                    },
                                                    {
                                                        earn: 'Sunday Earnings',
                                                        earnVal: sundayEarningsCalc,
                                                        ded: 'ESI',
                                                        dedVal: 0
                                                    },
                                                    {
                                                        earn: 'Special Allowance',
                                                        earnVal: 0,
                                                        ded: 'Professional Tax',
                                                        dedVal: 0
                                                    },
                                                    {
                                                        earn: 'Gross Salary',
                                                        earnVal: p.grossSalary,
                                                        ded: 'Salary Advance',
                                                        dedVal: p.advanceDeduction || 0
                                                    },
                                                    {
                                                        earn: 'Other Earnings',
                                                        earnVal: p.arrear || 0,
                                                        ded: 'TDS',
                                                        dedVal: p.tdsDeduction || 0
                                                    },
                                                    {
                                                        earn: 'Incentives',
                                                        earnVal: p.incentive || 0,
                                                        ded: 'Loan',
                                                        dedVal: p.loanDeduction || 0
                                                    },
                                                    {
                                                        earn: 'Bonus',
                                                        earnVal: p.bonus || 0,
                                                        ded: 'Security Deposit',
                                                        dedVal: p.securityDeposit || 0
                                                    },
                                                    {
                                                        earn: 'Over Time Pay',
                                                        earnVal: p.otAmount || 0,
                                                        ded: 'Other Deduction',
                                                        dedVal: p.otherDeductions || 0
                                                    }
                                                ].map((row, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                        className: idx % 2 === 0 ? 'bg-emerald-50 dark:bg-emerald-950/20' : '',
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                className: `px-3 py-1.5 border-b border-gray-200 ${idx % 2 === 0 ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''}`,
                                                                children: row.earn
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                                                lineNumber: 683,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                className: `px-3 py-1.5 border-b border-gray-200 text-right ${idx % 2 === 0 ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''}`,
                                                                children: [
                                                                    "₹",
                                                                    row.earnVal.toLocaleString('en-IN')
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                                                lineNumber: 684,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                className: `px-3 py-1.5 border-b border-gray-200 ${idx % 2 === 0 ? 'bg-red-50 dark:bg-red-950/20' : ''}`,
                                                                children: row.ded
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                                                lineNumber: 685,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                className: `px-3 py-1.5 border-b border-gray-200 text-right ${idx % 2 === 0 ? 'bg-red-50 dark:bg-red-950/20' : ''}`,
                                                                children: [
                                                                    "₹",
                                                                    row.dedVal.toLocaleString('en-IN')
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                                                lineNumber: 686,
                                                                columnNumber: 25
                                                            }, this)
                                                        ]
                                                    }, idx, true, {
                                                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                                        lineNumber: 682,
                                                        columnNumber: 23
                                                    }, this)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                    className: "border-t-2 border-gray-800 dark:border-gray-300",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "px-3 py-2 font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40",
                                                            children: "Total Earnings"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                                            lineNumber: 691,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "px-3 py-2 font-bold text-emerald-700 dark:text-emerald-400 text-right bg-emerald-100 dark:bg-emerald-950/40",
                                                            children: [
                                                                "₹",
                                                                totalEarningsCalc.toLocaleString('en-IN')
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                                            lineNumber: 692,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "px-3 py-2 font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/40",
                                                            children: "Net Pay"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                                            lineNumber: 693,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "px-3 py-2 font-extrabold text-[#1E3A5F] dark:text-blue-400 text-right bg-red-100 dark:bg-red-950/40 text-lg",
                                                            children: [
                                                                "₹",
                                                                p.netSalary.toLocaleString('en-IN')
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                                            lineNumber: 694,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                                    lineNumber: 690,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                            lineNumber: 671,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                    lineNumber: 662,
                                    columnNumber: 17
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                lineNumber: 661,
                                columnNumber: 15
                            }, this),
                            p.advanceDeduction > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(AdvanceSection, {
                                employeeId: e.employeeId,
                                month: month,
                                year: year,
                                advanceDeduction: p.advanceDeduction
                            }, void 0, false, {
                                fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                lineNumber: 702,
                                columnNumber: 17
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mx-5 mb-3 px-4 py-2 bg-blue-50 dark:bg-blue-950/30 rounded text-sm",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-bold text-[#1E3A5F] dark:text-blue-400",
                                        children: "In Words : "
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                        lineNumber: 707,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "italic text-[#1E3A5F] dark:text-blue-300",
                                        children: numberToWords(p.netSalary)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                        lineNumber: 708,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                lineNumber: 706,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "bg-[#1E3A5F] dark:bg-blue-900 px-5 py-4 grid grid-cols-2 gap-10",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mt-8 pt-2 border-t border-white/50 text-center text-white text-xs",
                                        children: "Prepared By"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                        lineNumber: 713,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mt-8 pt-2 border-t border-white/50 text-center text-white text-xs",
                                        children: "Received By"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                        lineNumber: 714,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                lineNumber: 712,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-center text-[9px] text-muted-foreground py-2 border-t border-dashed",
                                children: [
                                    "This is a computer-generated payslip by ",
                                    firmFullName,
                                    ". For queries contact HR at ",
                                    firmPhone
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                                lineNumber: 718,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                        lineNumber: 601,
                        columnNumber: 13
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                    lineNumber: 599,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                lineNumber: 598,
                columnNumber: 9
            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Card"], {
                className: "glass-card card-gold-hover border-0",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CardContent"], {
                    className: "p-8 text-center text-muted-foreground",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__["FileText"], {
                            className: "w-12 h-12 mx-auto mb-3 opacity-30"
                        }, void 0, false, {
                            fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                            lineNumber: 727,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            children: "Select an employee and period to generate salary slip"
                        }, void 0, false, {
                            fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                            lineNumber: 728,
                            columnNumber: 13
                        }, this),
                        employeeId && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-sm mt-2",
                            children: "No payroll found for this period. Generate payroll first."
                        }, void 0, false, {
                            fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                            lineNumber: 729,
                            columnNumber: 28
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                    lineNumber: 726,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
                lineNumber: 725,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/hrms/SalarySlipGenerator.tsx",
        lineNumber: 557,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=src_components_hrms_SalarySlipGenerator_tsx_cedb187a._.js.map