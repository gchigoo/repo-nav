---
doc_type: feature-implementation
feature: 2026-07-10-candidate-evidence-policy
status: completed
---

# candidate-evidence-policy 实现记录

## 动了哪些文件

- Production：`src/evidence/candidate-policy.ts`、`direct-mapping-classifier.ts`、`repository-evidence-engine.ts`、`RepositoryReader.readWindow`及`src/index.ts`。
- Tests/testkit：candidate policy unit/Golden/MCP specs、candidate fixture/backend、3个Golden manifests、MCP fixture service和runner registry。
- CodeStable：F5 checklist、goal state、implementation scope、permutation/minimal-loop evidence及本记录。

## 按步骤实现

### S1：truth table、verified context 与 lexical predicates

- `CANDIDATE_REASON_POLICY`成为六类reason owner/role/promotion唯一映射；promotion按schema顺序做ordered-set。
- `VerifiedCandidateContext`必须引用现存唯一seed并保留同file的exact focus slice；engine通过`RepositoryReader.readWindow`构造以focus为中心的12行/4 KiB verified window，既能包含后续closing delimiter，又不改变seed record/public ID。
- Candidate lexical scan复用F3 `maskNonCode`，identifier按NFKC与Unicode identifier grammar读取；balanced object/class/interface/type/SQL table container、alias delimiter和segment-one-change predicate均为封闭规则。
- derived draft精确切片到identifier行与excerpt，使用独立discovery key和filesystem-only provenance，不携带public ID。
- F6 `SECONDARY_BACKEND_HIT`只提供primary/secondary/merged provenance truth helper，F5 engine不调用、不输出该reason。

### S2：discovery-key互斥

- F3 classifier仍对每个merged record只选择一次confirmed或existing candidate；CandidatePolicy跳过seed identifier和当前已核验record focus token。
- confirmed seed的public discovery key与所有derived draft key保持互斥；policy draft只有`related`单一role，public ID由engine统一生成。

### S3：bounded selection与稳定停止

- 既有exact/symbol candidate先占预算；derived candidate使用剩余容量的bounded queue。
- selection按alias → entity → scope → file → lines → discovery key；输入records/contexts先稳定排序，permutation深等。
- 0/1/默认容量、截断、pre-abort均可判定；截断只表示eligible candidate未输出，并由engine映射`MAX_CANDIDATES_REACHED`，confirmed不变。

### S4：Golden/MCP最小闭环

- multi-line candidate fixture通过真实reader、engine、policy形成direct confirmed、alias/sibling candidates并排除container外decoy。
- 3个Golden manifests与真实stdio`candidate-minimal-loop`通过；structured/text parity由F4共享serializer继续保证。

## 第一性原则 pre-pass

- 外部行为：同一`repo_nav_locate`pack可同时返回当前direct mapping事实和受控verified candidate。
- 不可破约束：不扩大confirmed truth table；不枚举新文件；不复制seed provenance；不生成自然语言reason；不引入第二tool或新依赖。
- 最小充分改动：一个pure candidate policy、engine单一挂载点、复用F3 lexical mask和F4 transport。
- 必须不写：LLM/embedding/git/AST、numeric similarity、自动promotion、`SECONDARY_BACKEND_HIT` production ownership均未加入。

## Step evidence

- S1：CMD-TRUTH通过；alias/entity/scope positive，comment/string/regex/docs/unrelated false-positive，class/SQL container，12行/4 KiB与provenance/reference integrity均有断言。
- S2：CMD-EXCLUSIVE通过；confirmed seed只有一个public class/role，derived drafts无相同discovery key。
- S3：CMD-BUDGET通过；0/1边界、engine limit、pre-abort、records/contexts反序均通过。
- S4：CMD-LOOP通过；3 Golden + 1真实stdio MCP case通过。

## 方案边界与清洁度

- 未改变backend/process/MCP production协议；MCP只增加测试fixture观察入口。
- 共享变更仅为导出F3 non-code maskers并给RepositoryReader增加bounded verified window读取能力。
- 无production debug、TODO/FIXME/XXX、注释掉实现、unused import或第二套public contract。

## 实际交付物

- Policy/interface/truth constants：`src/evidence/candidate-policy.ts`。
- Engine mount：`src/evidence/repository-evidence-engine.ts`。
- Positive/negative fixtures：`testkit/fixtures/candidate-policy/`与3个candidate Golden manifests。
- Truth/budget/permutation：`test/unit/candidate-policy.spec.ts`与`candidate-evidence-policy-permutation-report.md`。
- Golden/MCP transcript summary：`candidate-evidence-policy-minimal-loop-report.md`。

## 基线与最后一轮本地审计

- 开工基线：build/typecheck、84/84 unit、25 active Golden加1 conditional skip、30/30 MCP全部通过。
- Round 3 review-fix后：build/typecheck通过；123/123 unit、28 active Golden加1 conditional skip、31/31 MCP全部通过。
- scope gate、6条core DoD commands和evidence pack均为`passed`；archguard/meta-cc provider在本机不可用但没有provider warning或核心证据缺口。
- `git diff --check`通过；production/testkit定向扫描无debug、TODO/FIXME/XXX、注释掉实现或unused import。

## 知识候选

- Candidate public ID必须在derived location/discovery key确定后生成，不能复用seed ID。
- 在F5阶段只定义secondary provenance truth table，不得提前把F6 reason注入production evidence。

## 推进顺序退出信号

- S1-S4均为`done`；C1-C12保持`pending`，由acceptance统一改为`passed`。

## Round 1 独立审查修复

- alias predicate按语法位置收窄：SQL `AS`只限`.sql`，`,`/`:`只限同一object owner，function parameters与class/interface/type annotation不再生成alias candidate。
- balanced scanner改为统一delimiter stack；任何outer未闭合或错配都令scope/entity fail closed。same-scope与same-entity改为比较两侧各自innermost owner，nested object/block不再跨容器关联。
- engine在`maxFiles`前按完整backend hit key稳定排序；新增2-file、`maxFiles=1`、正反hits的完整`LocateResult`深等测试。
- `EXACT_TERM_WITHOUT_DIRECT_MAPPING`在test/docs强制candidate路径固定为`reference`；secondary provenance严格限定`['ripgrep']`且primary已尝试。
- Golden与stdio MCP改为断言全部5条candidate symbol/reason exact set和顺序，不再只检查subset。
- 新增engine级同一occurrence互斥测试；confirmed与candidate discovery key在engine挂载点增加运行时不相交断言。
- bounded queue增加第二次有界reason归并扫描；candidate被淘汰后以更高优先reason重入时，仍保留完整reason ordered set，并有专门回归测试。

## Round 2 独立审查修复

- 新增`RepositoryReader.readWindow`，在单次verified file read内围绕focus构造并按行数/字节数收缩context；engine只把该window交给CandidatePolicy，confirmed record/location/ID维持原样。
- candidate fixture backend改为与真实ripgrep一致的single-line hit；另用真实`RipgrepBackend + NodeSafeProcessRunner + NodeRepositoryReader + production engine`验证`mapping.fixture`可产`hcpName/SAME_ENTITY_SIBLING`。
- type-position fail-closed覆盖普通annotation、`as`/`satisfies`、nested generic comma、tuple、function parameter和inline type literal；property name仍可作为sibling，type identifier不进入seed/candidate scan。
- `.sql` context复用F3 SQL-aware masker，覆盖`--`、single/double/dollar quote和nested block comment negatives；真实`SELECT hcpId AS hcpName`仍产alias。
- delimiter stack扩展到`[]`，与`{}`/`()`统一处理错配和未闭合；unclosed array不再产生scope/entity reason。
- `maxCandidates=0`跳过无保留key的第二次reason scan；六类truth table改为完整exact assertion。engine的schema v1调用仍遵守`maxCandidates<=20`、records/contexts各≤40，不在pure policy重复一套上限解析。

## Round 3 独立审查修复

- type-position recognizer增加保守angle-container检查，`<HcpName>hcpId`、`factory<HcpName>(hcpId)`及nested `Record<string, HcpName>`均exact零candidate。
- candidate context第二次reader核验除abort/可解释limit外不再静默吞掉`FILE_UNREADABLE`、binary、invalid range等错误；请求fail closed为typed internal error，不返回缺失candidate的假`ok`。
- 新增扩窗/仅focus两条engine路径的confirmed evidence深等断言，证明candidate window只影响derived candidates，不改变confirmed id/location/excerpt。
- `readWindow`新增byte shrink保留focus、focus本身超限与abort测试；`maxCandidates=0`无第二次reason merge扫描。
