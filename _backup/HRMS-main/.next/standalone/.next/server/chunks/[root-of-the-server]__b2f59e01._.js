module.exports=[24868,(e,t,a)=>{t.exports=e.x("fs/promises",()=>require("fs/promises"))},70961,e=>{"use strict";var t=e.i(47909),a=e.i(74017),r=e.i(96250),o=e.i(59756),n=e.i(61916),s=e.i(74677),i=e.i(69741),l=e.i(16795),d=e.i(87718),u=e.i(95169),c=e.i(47587),h=e.i(66012),y=e.i(70101),m=e.i(26937),p=e.i(10372),f=e.i(93695);e.i(52474);var $=e.i(220),g=e.i(89171),w=e.i(24868),A=e.i(14747),S=e.i(46786);let T=async()=>{let e=S.default.homedir();for(let t of[A.default.join(process.cwd(),".z-ai-config"),A.default.join(e,".z-ai-config"),"/etc/.z-ai-config"])try{let e=await w.default.readFile(t,"utf-8"),a=JSON.parse(e);if(a.baseUrl&&a.apiKey)return a}catch(e){"ENOENT"!==e.code&&console.error(`Error reading or parsing config file at ${t}:`,e)}throw Error("Configuration file not found or invalid. Please create .z-ai-config in your project, home directory, or /etc.")};class b{constructor(e){this.config=e,this.chat={completions:{create:this.createChatCompletion.bind(this),createVision:this.createChatCompletionVision.bind(this)}},this.audio={tts:{create:this.createAudioTTS.bind(this)},asr:{create:this.createAudioASR.bind(this)}},this.images={generations:{create:this.createImageGeneration.bind(this),edit:this.createImageEdit.bind(this)}},this.video={generations:{create:this.createVideoGeneration.bind(this)}},this.async={result:{query:this.queryAsyncResult.bind(this)}},this.functions={invoke:this.invokeFunction.bind(this)}}static async create(){return new b(await T())}async createChatCompletion(e){let{baseUrl:t,chatId:a,userId:r,apiKey:o,token:n}=this.config,s=`${t}/chat/completions`,i={"Content-Type":"application/json",Authorization:`Bearer ${o}`,"X-Z-AI-From":"Z"};a&&(i["X-Chat-Id"]=a),r&&(i["X-User-Id"]=r),n&&(i["X-Token"]=n);let l={...e,thinking:e.thinking||{type:"disabled"}};try{let e=await fetch(s,{method:"POST",headers:i,body:JSON.stringify(l)});if(!e.ok){let t=await e.text();throw Error(`API request failed with status ${e.status}: ${t}`)}let t=e.headers.get("content-type")||"";if(l.stream&&(t.includes("text/event-stream")||t.includes("text/plain")))return e.body;return await e.json()}catch(e){throw console.error("Failed to make API request:",e),e}}async createChatCompletionVision(e){let{baseUrl:t,chatId:a,userId:r,apiKey:o,token:n}=this.config,s=`${t}/chat/completions/vision`,i={"Content-Type":"application/json",Authorization:`Bearer ${o}`,"X-Z-AI-From":"Z"};a&&(i["X-Chat-Id"]=a),r&&(i["X-User-Id"]=r),n&&(i["X-Token"]=n);let l={...e,thinking:e.thinking||{type:"disabled"}};try{let e=await fetch(s,{method:"POST",headers:i,body:JSON.stringify(l)});if(!e.ok){let t=await e.text();throw Error(`API request failed with status ${e.status}: ${t}`)}let t=e.headers.get("content-type")||"";if(l.stream&&(t.includes("text/event-stream")||t.includes("text/plain")))return e.body;return await e.json()}catch(e){throw console.error("Failed to make vision API request:",e),e}}async createAudioTTS(e){let{baseUrl:t,chatId:a,userId:r,apiKey:o,token:n}=this.config,s=`${t}/audio/tts`,i={"Content-Type":"application/json",Authorization:`Bearer ${o}`,"X-Z-AI-From":"Z"};a&&(i["X-Chat-Id"]=a),r&&(i["X-User-Id"]=r),n&&(i["X-Token"]=n);try{let t=await fetch(s,{method:"POST",headers:i,body:JSON.stringify(e)});if(!t.ok){let e=await t.text();throw Error(`API request failed with status ${t.status}: ${e}`)}return t}catch(e){throw console.error("Failed to make TTS API request:",e),e}}async createAudioASR(e){let{baseUrl:t,chatId:a,userId:r,apiKey:o,token:n}=this.config,s=`${t}/audio/asr`,i={"Content-Type":"application/json",Authorization:`Bearer ${o}`,"X-Z-AI-From":"Z"};a&&(i["X-Chat-Id"]=a),r&&(i["X-User-Id"]=r),n&&(i["X-Token"]=n);try{let t=await fetch(s,{method:"POST",headers:i,body:JSON.stringify(e)});if(!t.ok){let e=await t.text();throw Error(`API request failed with status ${t.status}: ${e}`)}return await t.json()}catch(e){throw console.error("Failed to make ASR API request:",e),e}}async createImageGeneration(e){let{baseUrl:t,apiKey:a,chatId:r,userId:o,token:n}=this.config,s=`${t}/images/generations`,i={"Content-Type":"application/json",Authorization:`Bearer ${a}`,"X-Z-AI-From":"Z"};r&&(i["X-Chat-Id"]=r),o&&(i["X-User-Id"]=o),n&&(i["X-Token"]=n);let l={...e};try{let e=await fetch(s,{method:"POST",headers:i,body:JSON.stringify(l)});if(!e.ok){let t=await e.text();throw Error(`API request failed with status ${e.status}: ${t}`)}let t=await e.json(),a=await Promise.all(t.data.map(async e=>e.url?{base64:await this.downloadImageAsBase64(e.url),format:"png"}:e));return{...t,data:a}}catch(e){throw console.error("Failed to make image generation request:",e),e}}async createImageEdit(e){let{baseUrl:t,apiKey:a,chatId:r,userId:o,token:n}=this.config,s=`${t}/images/generations/edit`,i={"Content-Type":"application/json",Authorization:`Bearer ${a}`,"X-Z-AI-From":"Z"};r&&(i["X-Chat-Id"]=r),o&&(i["X-User-Id"]=o),n&&(i["X-Token"]=n);let l={...e};try{let e=await fetch(s,{method:"POST",headers:i,body:JSON.stringify(l)});if(!e.ok){let t=await e.text();throw Error(`API request failed with status ${e.status}: ${t}`)}let t=await e.json(),a=await Promise.all(t.data.map(async e=>e.url?{base64:await this.downloadImageAsBase64(e.url),format:"png"}:e));return{...t,data:a}}catch(e){throw console.error("Failed to make image edit request:",e),e}}async downloadImageAsBase64(e){try{let t=await fetch(e);if(!t.ok)throw Error(`Failed to download image: ${t.status}`);let a=await t.arrayBuffer(),r=Buffer.from(a).toString("base64");return`${r}`}catch(e){throw console.error("Failed to download and convert image to base64:",e),e}}async createVideoGeneration(e){let{baseUrl:t,apiKey:a,chatId:r,userId:o,token:n}=this.config,s=`${t}/video/generation`,i={"Content-Type":"application/json",Authorization:`Bearer ${a}`,"X-Z-AI-From":"Z"};r&&(i["X-Chat-Id"]=r),o&&(i["X-User-Id"]=o),n&&(i["X-Token"]=n);try{let t=await fetch(s,{method:"POST",headers:i,body:JSON.stringify(e)});if(!t.ok){let e=await t.text();throw Error(`API request failed with status ${t.status}: ${e}`)}return await t.json()}catch(e){throw console.error("Failed to make video generation request:",e),e}}async queryAsyncResult(e){let{baseUrl:t,apiKey:a,chatId:r,userId:o,token:n}=this.config,s=`${t}/async-result?id=${encodeURIComponent(e)}`,i={Authorization:`Bearer ${a}`,"X-Z-AI-From":"Z"};r&&(i["X-Chat-Id"]=r),o&&(i["X-User-Id"]=o),n&&(i["X-Token"]=n);try{let e=await fetch(s,{method:"GET",headers:i});if(!e.ok){let t=await e.text();throw Error(`API request failed with status ${e.status}: ${t}`)}return await e.json()}catch(e){throw console.error("Failed to query async result:",e),e}}async invokeFunction(e,t){let{baseUrl:a,apiKey:r,chatId:o,userId:n,token:s}=this.config,i=`${a}/functions/invoke`,l={"Content-Type":"application/json",Authorization:`Bearer ${r}`,"X-Z-AI-From":"Z"};o&&(l["X-Chat-Id"]=o),n&&(l["X-User-Id"]=n),s&&(l["X-Token"]=s);try{let a=await fetch(i,{method:"POST",headers:l,body:JSON.stringify({function_name:e,arguments:t})});if(!a.ok){let e=await a.text();throw Error(`Function invoke failed with status ${a.status}: ${e}`)}return(await a.json()).result}catch(e){throw console.error("Failed to invoke remote function:",e),e}}}var I=e.i(43793);async function v(e){try{let t,{message:a,context:r}=await e.json();if(!a||"string"!=typeof a)return g.NextResponse.json({error:"Message is required"},{status:400});let o=a.toLowerCase(),n=new Date,{targetDate:s,nextDay:i}=function(e){let t=new Date,a=new Date(t.getFullYear(),t.getMonth(),t.getDate()),r=e.toLowerCase(),o=new Date(a);if(r.includes("yesterday"))o.setDate(o.getDate()-1);else if(r.includes("day before yesterday"))o.setDate(o.getDate()-2);else if(r.includes("today"));else for(let e of[/on\s+(\d{4}-\d{2}-\d{2})/i,/on\s+(\d{2}\/\d{2}\/\d{4})/i,/(\d{4}-\d{2}-\d{2})/i,/(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(\d{4})?/i,/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2}),?\s*(\d{4})?/i]){let t=r.match(e);if(t){try{let e=new Date(t[1]||t[0]);isNaN(e.getTime())||(o=new Date(e.getFullYear(),e.getMonth(),e.getDate()))}catch{}break}}let n=new Date(o);return n.setDate(n.getDate()+1),{targetDate:o,nextDay:n}}(a),l=s.toISOString().split("T")[0],[d,u,c,h]=await Promise.all([I.db.attendance.findMany({where:{date:{gte:s,lt:i}},include:{employee:{select:{fullName:!0,employeeId:!0,department:!0,firm:!0,location:!0,monthlySalary:!0,shiftHours:!0,salaryType:!0,designation:!0}}}}),I.db.employee.count({where:{status:{notIn:["inactive","No"]}}}),I.db.employee.findMany({where:{status:{notIn:["inactive","No"]}},select:{fullName:!0,employeeId:!0,department:!0,firm:!0,location:!0,monthlySalary:!0,shiftHours:!0,salaryType:!0,designation:!0}}),I.db.employee.count({where:{status:{in:["inactive","No"]}}})]),y=new Date(n.getFullYear(),n.getMonth(),1),m=new Date(n.getFullYear(),n.getMonth()+1,1),p=function(e){let t=e.toLowerCase(),a=new Date,r=["january","february","march","april","may","june","july","august","september","october","november","december"],o=["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];for(let e=0;e<r.length;e++)if(t.includes(r[e])||t.includes(o[e])){let r=t.match(/\b(20\d{2})\b/),o=r?parseInt(r[1]):a.getFullYear(),n=e;return{monthStart:new Date(o,n,1),monthEnd:new Date(o,n+1,1),month:n+1,year:o}}if(t.includes("this month")||t.includes("current month")){let e=a.getMonth(),t=a.getFullYear();return{monthStart:new Date(t,e,1),monthEnd:new Date(t,e+1,1),month:e+1,year:t}}if(t.includes("last month")||t.includes("previous month")){let e=a.getMonth()-1,t=e<0?a.getFullYear()-1:a.getFullYear(),r=e<0?11:e;return{monthStart:new Date(t,r,1),monthEnd:new Date(t,r+1,1),month:r+1,year:t}}return null}(a),f=p?.monthStart||y,$=p?.monthEnd||m,w=p?.month||n.getMonth()+1,A=p?.year||n.getFullYear(),S=await I.db.attendance.findMany({where:{date:{gte:f,lt:$}},include:{employee:{select:{fullName:!0,employeeId:!0,department:!0,firm:!0,location:!0}}}}),T=await I.db.payroll.findMany({where:{month:w,year:A},include:{employee:{select:{fullName:!0,employeeId:!0,firm:!0,location:!0,department:!0}}}}),v=d.filter(e=>["present","late","half-day","half_day","early-out"].includes(e.status)),E=d.filter(e=>"absent"===e.status),N=d.filter(e=>e.lateEntry),O=d.filter(e=>e.earlyOut),R=d.filter(e=>e.halfDay),C=d.reduce((e,t)=>e+(t.overtimeHours||0),0),D=new Set(d.filter(e=>"absent"!==e.status).map(e=>e.employeeId)),k=c.filter(e=>!D.has(e.employeeId)).map(e=>`${e.fullName} (${e.employeeId})`),P=S.reduce((e,t)=>e+(t.totalHours||0),0),H=S.reduce((e,t)=>e+(t.overtimeHours||0),0),x=new Set(S.map(e=>e.employeeId)).size,F=S.filter(e=>e.lateEntry).length,L=S.filter(e=>"absent"===e.status).length,j=S.filter(e=>["present","late","half-day","half_day","early-out"].includes(e.status)).length,M=S.filter(e=>e.halfDay).length,q=S.filter(e=>e.earlyOut).length,X=S.filter(e=>e.isSunday).length,U=S.filter(e=>e.isPH).length,B=T.reduce((e,t)=>e+t.grossSalary,0),W=T.reduce((e,t)=>e+t.netSalary,0),_=T.reduce((e,t)=>e+t.totalDeductions,0),G=T.reduce((e,t)=>e+t.otAmount,0),Z=T.reduce((e,t)=>e+t.bonus,0),z=T.reduce((e,t)=>e+t.incentive,0),Y="",J=c.find(e=>o.includes(e.fullName.toLowerCase())||o.includes(e.employeeId.toLowerCase()));if(J){let e=await I.db.attendance.findMany({where:{employeeId:J.employeeId,date:{gte:f,lt:$}},orderBy:{date:"asc"}}),t=await I.db.payroll.findFirst({where:{employeeId:J.employeeId,month:w,year:A}}),a=e.filter(e=>["present","late","half-day","half_day","early-out"].includes(e.status)).length,r=e.filter(e=>"absent"===e.status).length,o=e.filter(e=>e.lateEntry).length,n=e.filter(e=>e.earlyOut).length,s=e.reduce((e,t)=>e+(t.totalHours||0),0),i=e.reduce((e,t)=>e+(t.overtimeHours||0),0);Y=`
### Employee: ${J.fullName} (${J.employeeId})
- Firm: ${J.firm} | Location: ${J.location}
- Department: ${J.department||"N/A"} | Designation: ${J.designation||"N/A"}
- Salary Type: ${J.salaryType} | Monthly Salary: ₹${J.monthlySalary?.toLocaleString("en-IN")||"N/A"}
- Shift Hours: ${J.shiftHours} hrs

**${w}/${A} Attendance Summary:**
- Total Records: ${e.length}
- Present Days: ${a}
- Absent Days: ${r}
- Late Entries: ${o}
- Early Outs: ${n}
- Total Work Hours: ${s.toFixed(2)}
- Total OT Hours: ${i.toFixed(2)}

**Daily Breakdown:**
${e.map(e=>{let t=e.date.toISOString().split("T")[0];return`- ${t}: ${e.status} | ${e.totalHours.toFixed(2)}hrs | In: ${e.checkIn||"-"} Out: ${e.checkOut||"-"} | OT: ${e.overtimeHours.toFixed(2)}hrs${e.lateEntry?" ⚠️ Late":""}${e.earlyOut?" ⚠️ Early Out":""}${e.halfDay?" (Half Day)":""}`}).join("\n")}
${t?`
**Payroll for ${w}/${A}:**
- Monthly Salary: ₹${t.monthlySalary.toLocaleString("en-IN")}
- Hourly Rate: ₹${t.hourlyRate}
- Total Worked Hours: ${t.totalWorkedHrs.toFixed(2)}
- OT Hours: ${t.otHours.toFixed(2)} | OT Amount: ₹${t.otAmount.toLocaleString("en-IN")}
- Sunday Hours: ${t.sundayHrs.toFixed(2)}
- Present Days: ${t.presentDays} | Absent Days: ${t.absentDays}
- Gross Salary: ₹${t.grossSalary.toLocaleString("en-IN")}
- Deductions: TDS ₹${t.tdsDeduction} | Loan ₹${t.loanDeduction} | Advance ₹${t.advanceDeduction} | Security ₹${t.securityDeposit} | Other ₹${t.otherDeductions} | Total ₹${t.totalDeductions.toLocaleString("en-IN")}
- Bonus: ₹${t.bonus.toLocaleString("en-IN")} | Incentive: ₹${t.incentive.toLocaleString("en-IN")}
- **Net Salary: ₹${t.netSalary.toLocaleString("en-IN")}**
`:`
No payroll record found for ${w}/${A}.`}
`}let K={};for(let e of S){let t=e.employee?.firm||"Unknown";K[t]||(K[t]={present:0,absent:0,late:0,otHours:0,workHours:0}),["present","late","half-day","half_day","early-out"].includes(e.status)&&K[t].present++,"absent"===e.status&&K[t].absent++,e.lateEntry&&K[t].late++,K[t].otHours+=e.overtimeHours||0,K[t].workHours+=e.totalHours||0}let V={};for(let e of c)V[e.firm]=(V[e.firm]||0)+1;let Q=`
## Real-Time HRMS Data (Queried at: ${n.toISOString()})

### Target Date: ${l}

### Attendance Overview for ${l}
- Total Active Employees: ${u}
- Attendance Records Found: ${d.length}
- **Present**: ${v.length} employees — ${v.map(e=>`${e.employee?.fullName||e.employeeId}`).join(", ")}
- **Absent** (no record or status=absent): ${k.length} employees — ${k.slice(0,30).join(", ")}${k.length>30?` ... and ${k.length-30} more`:""}
- **Marked Absent**: ${E.length} employees — ${E.map(e=>`${e.employee?.fullName||e.employeeId}`).join(", ")}
- **Late**: ${N.length} employees — ${N.map(e=>`${e.employee?.fullName||e.employeeId}`).join(", ")}
- **Early Out**: ${O.length} employees — ${O.map(e=>`${e.employee?.fullName||e.employeeId}`).join(", ")}
- **Half Day**: ${R.length} employees
- **Total OT Hours**: ${C.toFixed(2)} hours

### Monthly Summary (${w}/${A})
- Total Attendance Records: ${S.length}
- Unique Employees with Records: ${x}
- Present Count: ${j}
- Absent Count: ${L}
- Late Count: ${F}
- Early Out Count: ${q}
- Half Day Count: ${M}
- Sundays: ${X} | Public Holidays: ${U}
- Total Work Hours: ${P.toFixed(2)}
- Total OT Hours: ${H.toFixed(2)}

### Firm-Wise Breakdown (${w}/${A})
${Object.entries(K).map(([e,t])=>`- **${e}** (${V[e]||"?"} employees): Present ${t.present} | Absent ${t.absent} | Late ${t.late} | Work Hours ${t.workHours.toFixed(2)} | OT Hours ${t.otHours.toFixed(2)}`).join("\n")}

### Payroll Summary (${w}/${A})
- Payroll Records: ${T.length}
- Total Gross Salary: ₹${B.toLocaleString("en-IN")}
- Total Net Salary: ₹${W.toLocaleString("en-IN")}
- Total Deductions: ₹${_.toLocaleString("en-IN")}
- Total OT Amount: ₹${G.toLocaleString("en-IN")}
- Total Bonus: ₹${Z.toLocaleString("en-IN")}
- Total Incentive: ₹${z.toLocaleString("en-IN")}

${T.length>0?`**Top 5 Highest Net Salary:**
${T.sort((e,t)=>t.netSalary-e.netSalary).slice(0,5).map(e=>`- ${e.employee?.fullName} (${e.employeeId}): ₹${e.netSalary.toLocaleString("en-IN")}`).join("\n")}`:""}

${T.length>0?`**Top 5 Lowest Net Salary:**
${T.sort((e,t)=>e.netSalary-t.netSalary).slice(0,5).map(e=>`- ${e.employee?.fullName} (${e.employeeId}): ₹${e.netSalary.toLocaleString("en-IN")}`).join("\n")}`:""}

### All Active Employees (${c.length})
${c.map(e=>`- ${e.fullName} (${e.employeeId}) | ${e.firm} | ${e.location} | ${e.designation||"N/A"} | ₹${e.monthlySalary?.toLocaleString("en-IN")||"0"} | Shift: ${e.shiftHours}hrs`).join("\n")}

${Y}
`;try{let e=await b.create(),r=await e.chat.completions.create({messages:[{role:"system",content:`You are an advanced AI HR Assistant for Laxree Group's HR & Salary Management Dashboard (Laxree HRMS). You have access to REAL-TIME data from the HRMS database.

## Company Information
- **Laxree Group** has 4 firms:
  - LAPL: LAXREE AMENITIES PVT LTD (Gurgaon/Palra Warehouse)
  - LRSL: LAXREE ROOFING SOLUTION (Ajmer/Roofing Factory)
  - SI: SMARTH INTERNATIONAL (Jaipur)
  - SDF: SANGRAH DECOR & FURNITURE (Ajmer)
- **Locations**: Ajmer, Gurgaon, Palra Warehouse, Jaipur, Roofing Factory
- **Employee ID Format**: EMP-XXX
- **Currency**: INR (Indian Rupees) — use ₹ symbol

## Payroll Rules (Laxree-Specific)
- **Salary Types**: Hourly workers and Daily wage workers
- **Salary Per Hour** = Monthly Salary / (Shift Hours \xd7 Days in Month)
- **Per Day Rate** = Monthly Salary / Days in Month (28, 29, 30, or 31 as per calendar)
- **Base Salary** = Per Day Rate \xd7 Earned Days (Sundays NOT counted as earned)
- **Earned Days** = Present Days + Half Days \xd7 0.5 + Paid Leaves (Sundays are weekly off)
- **For All Workers**: Gross = Base Salary + OT Amount + Bonus + Incentive
- **Sundays are weekly off** — NOT counted as present or earned days, no Sunday pay
- **OT Rate** = Same as Salary/Hour (base rate, 1x — NOT 1.5x)
- **Deductions**: TDS, Loan, Advance, Security Deposit, Other Deductions
- **Net Salary** = Gross Salary + Arrear - Total Deductions

## Attendance Rules
- Sundays are automatically detected
- Public Holidays are configured in the system
- OT is calculated when total hours > shift hours
- Status: present, absent, late, half-day, weekly-off, holiday, early-out
- Employee active status: anything except "inactive" or "No" = active

## Your Capabilities
You have access to REAL attendance, payroll, and employee data. You can:
- Tell who was present/absent on any date
- Show attendance breakdown for any employee
- Calculate work hours, OT hours
- Provide monthly attendance summaries
- Answer payroll questions with real numbers
- Compare attendance across firms/locations
- Identify trends and anomalies

When answering questions about specific data, ALWAYS use the REAL DATA provided below. Give exact numbers, names, and details. Do not make up or estimate data. If data is not available, say so clearly.

Be concise, professional, and data-driven. Use Indian workplace context. Format responses with markdown for readability:
- Use **bold** for emphasis
- Use bullet points (•) for lists
- Use numbered lists for steps
- Use tables when comparing data
- When showing numbers, use Indian number formatting (lakhs/crores) with ₹ symbol

${Q}`},{role:"user",content:a}]});t=r.choices[0]?.message?.content||""}catch(e){console.error("AI SDK error, falling back to rule-based response:",e?.message||e),t=function(e,t){let a=e.toLowerCase(),r=e=>{let a=RegExp(`### ${e}[\\s\\S]*?(?=###|$)`,"i"),r=t.match(a);return r?r[0]:""};if(a.includes("absent")&&(a.includes("who")||a.includes("list")||a.includes("today")||a.includes("name"))){let e=r("Attendance Overview"),t=e.match(/\*\*Absent\*[^:]*:\s*\d+\s*employees\s*—\s*(.*)/),a=e.match(/\*\*Marked Absent\*[^:]*:\s*\d+\s*employees\s*—\s*(.*)/),o=e.match(/\*\*Absent\*[^:]*:\s*(\d+)\s*employees/),n=o?o[1]:"0",s=`📋 **Absent Employees** (${n} absent)

`;return t&&t[1].trim()&&(s+=t[1].split(", ").filter(e=>e.trim()).map(e=>`• ${e}`).join("\n")),a&&a[1].trim()&&(s+=`

**Marked Absent:** ${a[1]}`),"0"===n&&(s+="No employees are absent today! 🎉"),s}if(a.includes("present")&&(a.includes("who")||a.includes("list")||a.includes("today")||a.includes("name"))){let e=r("Attendance Overview").match(/\*\*Present\*[^:]*:\s*(\d+)\s*employees\s*—\s*(.*)/),t=e?e[1]:"0",a=`✅ **Present Employees** (${t} present)

`;if(e&&e[2].trim()){let t=e[2].split(", ").filter(e=>e.trim());t.length<=15?a+=t.map(e=>`• ${e}`).join("\n"):(a+=t.slice(0,15).map(e=>`• ${e}`).join("\n"),a+=`

... and ${t.length-15} more employees`)}return a}if(a.includes("late")&&(a.includes("who")||a.includes("list")||a.includes("today")||a.includes("name")||a.includes("how many"))){let e=r("Attendance Overview").match(/\*\*Late\*[^:]*:\s*(\d+)\s*employees\s*—\s*(.*)/),t=e?e[1]:"0",a=`⏰ **Late Entries** (${t} late)

`;return e&&e[2].trim()&&(a+=e[2].split(", ").filter(e=>e.trim()).map(e=>`• ${e}`).join("\n")),"0"===t&&(a+="No late entries today! 👍"),a}if(a.includes("early out")||a.includes("early-out")||a.includes("left early")){let e=r("Attendance Overview").match(/\*\*Early Out\*[^:]*:\s*(\d+)\s*employees\s*—\s*(.*)/),t=e?e[1]:"0",a=`🚪 **Early Outs** (${t} early outs)

`;return e&&e[2].trim()&&(a+=e[2].split(", ").filter(e=>e.trim()).map(e=>`• ${e}`).join("\n")),"0"===t&&(a+="No early outs today! 👍"),a}if(a.includes("half day")||a.includes("half-day")){let e=r("Attendance Overview").match(/\*\*Half Day\*[^:]*:\s*(\d+)/),t=e?e[1]:"0";return`📋 **Half Days**: ${t} employees on half day today.`}if(a.includes("ot")||a.includes("overtime")){let e=r("Attendance Overview").match(/\*\*Total OT Hours\*[^:]*:\s*([\d.]+)\s*hours/),t=e?e[1]:"0.00",a=r("Monthly Summary").match(/Total OT Hours:\s*([\d.]+)/),o=a?a[1]:"0.00",n=`⏱️ **Overtime Summary**

`;return n+=`• **Today's Total OT**: ${t} hours
• **Monthly Total OT**: ${o} hours
`}if(a.includes("attendance summary")||a.includes("this month")||a.includes("monthly summary")||a.includes("current month")){let e=r("Monthly Summary"),t=r("Attendance Overview"),a=`📊 **Monthly Attendance Summary**

`;for(let[t,r]of[["Total Attendance Records",/Total Attendance Records:\s*(\d+)/],["Unique Employees",/Unique Employees with Records:\s*(\d+)/],["Present Count",/Present Count:\s*(\d+)/],["Absent Count",/Absent Count:\s*(\d+)/],["Late Count",/Late Count:\s*(\d+)/],["Early Out Count",/Early Out Count:\s*(\d+)/],["Half Day Count",/Half Day Count:\s*(\d+)/],["Total Work Hours",/Total Work Hours:\s*([\d.]+)/],["Total OT Hours",/Total OT Hours:\s*([\d.]+)/]]){let o=e.match(r);a+=`• **${t}**: ${o?o[1]:"N/A"}
`}let o=t.match(/\*\*Present\*[^:]*:\s*(\d+)/),n=t.match(/\*\*Absent\*[^:]*:\s*(\d+)/),s=t.match(/\*\*Late\*[^:]*:\s*(\d+)/);return a+=`
**Today's Snapshot:**
• Present: ${o?o[1]:"0"} | Absent: ${n?n[1]:"0"} | Late: ${s?s[1]:"0"}`}if(a.includes("payroll")||a.includes("salary")||a.includes("deduction")||a.includes("net pay")||a.includes("gross")){let e=r("Payroll Summary"),t=`💰 **Payroll Summary**

`;for(let[a,r]of[["Total Gross Salary",/Total Gross Salary:\s*₹?([\d,]+)/],["Total Net Salary",/Total Net Salary:\s*₹?([\d,]+)/],["Total Deductions",/Total Deductions:\s*₹?([\d,]+)/],["Total OT Amount",/Total OT Amount:\s*₹?([\d,]+)/],["Total Bonus",/Total Bonus:\s*₹?([\d,]+)/],["Total Incentive",/Total Incentive:\s*₹?([\d,]+)/]]){let o=e.match(r);t+=`• **${a}**: ₹${o?o[1]:"N/A"}
`}return t}if(a.includes("firm")||a.includes("company")||a.includes("lapl")||a.includes("lrsl")||a.includes("si ")||a.includes("sdf")||a.includes("laxree amenities")||a.includes("laxree roofing")||a.includes("smarth")||a.includes("sangrah")){let e=r("Firm-Wise Breakdown");if(e){let t=`🏢 **Firm-Wise Breakdown**

`;for(let a of e.split("\n").filter(e=>e.trim().startsWith("-")))t+=`${a}
`;return t}}let o=r("All Active Employees");if(o)for(let e of o.split("\n").filter(e=>e.trim().startsWith("-"))){let r=e.match(/-\s*(.+?)\s*\(([^)]+)\)/);if(r){let o=r[1],n=r[2];if(a.includes(o.toLowerCase())||a.includes(n.toLowerCase())){let a=t.match(/### Employee:.*?(?=###|$)/s);if(a)return`👤 **Employee Details**

${a[0].replace(/### /g,"**").replace(/:\n/g,":**\n")}`;return`👤 **Employee Found**:

${e.replace(/^-\s*/,"")}`}}}if(a.includes("how many")||a.includes("headcount")||a.includes("total employee")||a.includes("employee count")){let e=r("Attendance Overview").match(/Total Active Employees:\s*(\d+)/),t=e?e[1]:"N/A",a=r("All Active Employees").split("\n").filter(e=>e.trim().startsWith("-")),o=`👥 **Employee Count**: ${t} active employees

`,n={};for(let e of a){let t=e.split("|");if(t.length>=2){let e=t[1]?.trim()||"Unknown";n[e]=(n[e]||0)+1}}if(Object.keys(n).length>0)for(let[e,t]of(o+="**By Firm:**\n",Object.entries(n)))o+=`• ${e}: ${t} employees
`;return o}if(a.includes("overview")||a.includes("dashboard")||a.includes("summary")||a.includes("report")||a.includes("status")||a.includes("hello")||a.includes("hi ")||"hi"===a||a.includes("help")){let e=r("Attendance Overview"),t=r("Monthly Summary"),a=e.match(/Total Active Employees:\s*(\d+)/),o=e.match(/\*\*Present\*[^:]*:\s*(\d+)/),n=e.match(/\*\*Absent\*[^:]*:\s*(\d+)/),s=e.match(/\*\*Late\*[^:]*:\s*(\d+)/),i=t.match(/Present Count:\s*(\d+)/),l=t.match(/Absent Count:\s*(\d+)/),d=t.match(/Late Count:\s*(\d+)/),u=`📊 **Laxree HRMS Dashboard Overview**

`;return u+=`**Today's Attendance:**
• Active Employees: ${a?a[1]:"N/A"}
• Present: ${o?o[1]:"0"} | Absent: ${n?n[1]:"0"} | Late: ${s?s[1]:"0"}

**Monthly Summary:**
• Present Count: ${i?i[1]:"0"} | Absent: ${l?l[1]:"0"} | Late: ${d?d[1]:"0"}

I can help you with:
• "Who is absent today?"
• "Who was late?"
• "Attendance summary this month"
• "Show payroll details"
• "OT hours report"
• Employee-specific queries
• Firm-wise breakdowns
`}let n=r("Attendance Overview"),s=n.match(/Total Active Employees:\s*(\d+)/),i=n.match(/\*\*Present\*[^:]*:\s*(\d+)/),l=n.match(/\*\*Absent\*[^:]*:\s*(\d+)/);return`I understand you're asking about: "${e}"

Here's a quick snapshot of current data:

• **Active Employees**: ${s?s[1]:"N/A"}
• **Present**: ${i?i[1]:"0"} | **Absent**: ${l?l[1]:"0"}

For more specific information, try asking:
- "Who is absent today?"
- "Attendance summary this month"
- "Who was late?"
- "Show payroll details"
- "OT hours report"`}(a,Q)}return t||(t='I apologize, I could not process your request. Please try again or ask a specific question like "Who is absent today?"'),g.NextResponse.json({reply:t})}catch(e){return console.error("AI Assistant error:",e),g.NextResponse.json({error:e.message||"Internal server error"},{status:500})}}e.s(["POST",()=>v],96662);var E=e.i(96662);let N=new t.AppRouteRouteModule({definition:{kind:a.RouteKind.APP_ROUTE,page:"/api/ai-assistant/route",pathname:"/api/ai-assistant",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/src/app/api/ai-assistant/route.ts",nextConfigOutput:"standalone",userland:E}),{workAsyncStorage:O,workUnitAsyncStorage:R,serverHooks:C}=N;function D(){return(0,r.patchFetch)({workAsyncStorage:O,workUnitAsyncStorage:R})}async function k(e,t,r){N.isDev&&(0,o.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let g="/api/ai-assistant/route";g=g.replace(/\/index$/,"")||"/";let w=await N.prepare(e,t,{srcPage:g,multiZoneDraftMode:!1});if(!w)return t.statusCode=400,t.end("Bad Request"),null==r.waitUntil||r.waitUntil.call(r,Promise.resolve()),null;let{buildId:A,params:S,nextConfig:T,parsedUrl:b,isDraftMode:I,prerenderManifest:v,routerServerContext:E,isOnDemandRevalidate:O,revalidateOnlyGenerated:R,resolvedPathname:C,clientReferenceManifest:D,serverActionsManifest:k}=w,P=(0,i.normalizeAppPath)(g),H=!!(v.dynamicRoutes[P]||v.routes[C]),x=async()=>((null==E?void 0:E.render404)?await E.render404(e,t,b,!1):t.end("This page could not be found"),null);if(H&&!I){let e=!!v.routes[C],t=v.dynamicRoutes[P];if(t&&!1===t.fallback&&!e){if(T.experimental.adapterPath)return await x();throw new f.NoFallbackError}}let F=null;!H||N.isDev||I||(F="/index"===(F=C)?"/":F);let L=!0===N.isDev||!H,j=H&&!L;k&&D&&(0,s.setManifestsSingleton)({page:g,clientReferenceManifest:D,serverActionsManifest:k});let M=e.method||"GET",q=(0,n.getTracer)(),X=q.getActiveScopeSpan(),U={params:S,prerenderManifest:v,renderOpts:{experimental:{authInterrupts:!!T.experimental.authInterrupts},cacheComponents:!!T.cacheComponents,supportsDynamicResponse:L,incrementalCache:(0,o.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:T.cacheLife,waitUntil:r.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,a,r,o)=>N.onRequestError(e,t,r,o,E)},sharedContext:{buildId:A}},B=new l.NodeNextRequest(e),W=new l.NodeNextResponse(t),_=d.NextRequestAdapter.fromNodeNextRequest(B,(0,d.signalFromNodeResponse)(t));try{let s=async e=>N.handle(_,U).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let a=q.getRootSpanAttributes();if(!a)return;if(a.get("next.span_type")!==u.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${a.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let r=a.get("next.route");if(r){let t=`${M} ${r}`;e.setAttributes({"next.route":r,"http.route":r,"next.span_name":t}),e.updateName(t)}else e.updateName(`${M} ${g}`)}),i=!!(0,o.getRequestMeta)(e,"minimalMode"),l=async o=>{var n,l;let d=async({previousCacheEntry:a})=>{try{if(!i&&O&&R&&!a)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let n=await s(o);e.fetchMetrics=U.renderOpts.fetchMetrics;let l=U.renderOpts.pendingWaitUntil;l&&r.waitUntil&&(r.waitUntil(l),l=void 0);let d=U.renderOpts.collectedTags;if(!H)return await (0,h.sendResponse)(B,W,n,U.renderOpts.pendingWaitUntil),null;{let e=await n.blob(),t=(0,y.toNodeOutgoingHttpHeaders)(n.headers);d&&(t[p.NEXT_CACHE_TAGS_HEADER]=d),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let a=void 0!==U.renderOpts.collectedRevalidate&&!(U.renderOpts.collectedRevalidate>=p.INFINITE_CACHE)&&U.renderOpts.collectedRevalidate,r=void 0===U.renderOpts.collectedExpire||U.renderOpts.collectedExpire>=p.INFINITE_CACHE?void 0:U.renderOpts.collectedExpire;return{value:{kind:$.CachedRouteKind.APP_ROUTE,status:n.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:a,expire:r}}}}catch(t){throw(null==a?void 0:a.isStale)&&await N.onRequestError(e,t,{routerKind:"App Router",routePath:g,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:j,isOnDemandRevalidate:O})},!1,E),t}},u=await N.handleResponse({req:e,nextConfig:T,cacheKey:F,routeKind:a.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:v,isRoutePPREnabled:!1,isOnDemandRevalidate:O,revalidateOnlyGenerated:R,responseGenerator:d,waitUntil:r.waitUntil,isMinimalMode:i});if(!H)return null;if((null==u||null==(n=u.value)?void 0:n.kind)!==$.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==u||null==(l=u.value)?void 0:l.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});i||t.setHeader("x-nextjs-cache",O?"REVALIDATED":u.isMiss?"MISS":u.isStale?"STALE":"HIT"),I&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let f=(0,y.fromNodeOutgoingHttpHeaders)(u.value.headers);return i&&H||f.delete(p.NEXT_CACHE_TAGS_HEADER),!u.cacheControl||t.getHeader("Cache-Control")||f.get("Cache-Control")||f.set("Cache-Control",(0,m.getCacheControlHeader)(u.cacheControl)),await (0,h.sendResponse)(B,W,new Response(u.value.body,{headers:f,status:u.value.status||200})),null};X?await l(X):await q.withPropagatedContext(e.headers,()=>q.trace(u.BaseServerSpan.handleRequest,{spanName:`${M} ${g}`,kind:n.SpanKind.SERVER,attributes:{"http.method":M,"http.target":e.url}},l))}catch(t){if(t instanceof f.NoFallbackError||await N.onRequestError(e,t,{routerKind:"App Router",routePath:P,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:j,isOnDemandRevalidate:O})},!1,E),H)throw t;return await (0,h.sendResponse)(B,W,new Response(null,{status:500})),null}}e.s(["handler",()=>k,"patchFetch",()=>D,"routeModule",()=>N,"serverHooks",()=>C,"workAsyncStorage",()=>O,"workUnitAsyncStorage",()=>R],70961)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__b2f59e01._.js.map