const imgPointinghand = "https://www.figma.com/api/mcp/asset/69ac109f-1d46-44ad-8953-97e2944f7ce6.svg";
const imgRectangle1 = "https://www.figma.com/api/mcp/asset/362ff021-671a-4c22-820e-0e2ca8fdb643.png";
const imgLogo = "https://www.figma.com/api/mcp/asset/5619ada3-428a-4226-9978-1ff3d9aa5816.svg";
const imgSlot = "https://www.figma.com/api/mcp/asset/3c5e9f6d-2e43-4552-8466-e924687c5f9a.svg";
const imgMaisonAi = "https://www.figma.com/api/mcp/asset/559350a2-5a57-43f4-a8ef-9872bc7b5bc4.svg";
const imgGeneric = "https://www.figma.com/api/mcp/asset/9b8fdbbb-d395-4adb-8a68-a88d73585096.svg";

function Pointinghand({ className }: { className?: string }) {
  return (
    <div className={className || "h-[17px] overflow-clip relative w-[16px]"} data-node-id="464:37770" data-name="pointinghand">
      <div className="absolute contents inset-[2.81%_7.83%_7.38%_2.74%]" data-node-id="464:37771" data-name="bundle os x cursors">
        <div className="absolute contents inset-[2.81%_7.83%_7.38%_2.74%]" data-node-id="464:37772" data-name="Made with 💕by Azendoo design team   @azendoo">
          <div className="absolute inset-[2.81%_7.83%_7.38%_2.74%]" data-node-id="464:37773" data-name="pointinghand">
            <div className="absolute inset-[-2.46%_-2.62%]">
              <img alt="" className="block max-w-none size-full" src={imgPointinghand} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type TableCellMemberProps = {
  className?: string;
  type?: "Text Button";
};

function TableCellMember({ className, type = "Text Button" }: TableCellMemberProps) {
  return (
    <div className={className || "border-[var(--surface\\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-[64px] items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-3,12px)] relative w-[160px]"} data-node-id="321:31366">
      <div className="[word-break:break-word] content-stretch flex gap-[var(--spacing-1,4px)] items-center relative shrink-0 text-[color:var(--primary\/default,#50f)] whitespace-nowrap" data-node-id="565:107758" data-name="Link text">
        <p className="font-['Material_Symbols_Rounded:Regular'] font-normal leading-none relative shrink-0 text-[20px] text-center" data-node-id="I565:107758;2043:1379" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
          person_add
        </p>
        <div className="flex flex-col font-[family-name:var(--font\/family\/inter,'Inter:SemiBold')] font-[var(--font\/weight\/semibold,normal)] justify-center leading-[0] relative shrink-0 text-[length:var(--font\/size\/m,14px)]" data-node-id="I565:107758;2043:1380">
          <p className="leading-[20px]">Assign</p>
        </div>
      </div>
    </div>
  );
}

type TableRowLeadDefaultProps = {
  className?: string;
  state?: "Default";
  type?: "HD";
};

function TableRowLeadDefault({ className, state = "Default", type = "HD" }: TableRowLeadDefaultProps) {
  return (
    <div className={className || "content-stretch flex h-[56px] items-center relative"} data-node-id="321:31372">
      <div className="[word-break:break-word] border-[var(--surface\/variant,#e5e5e5)] border-r-[length:var(--border-2,2px)] border-solid content-stretch flex gap-[var(--spacing-1,4px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-4,16px)] relative shrink-0 text-[color:var(--on-surface\/secondary,#666)] w-[240px] whitespace-nowrap" data-node-id="408:48704" data-name="Table / Header / Title + Icon">
        <div className="content-stretch flex flex-[1_0_0] gap-[4px] items-center min-w-px relative" data-node-id="517:18111">
          <p className="font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium leading-[16px] overflow-hidden relative shrink-0 text-[12px] text-ellipsis uppercase" data-node-id="408:48705">
            LEAD Name
          </p>
          <p className="font-['Material_Symbols_Rounded:Regular'] font-normal leading-none relative shrink-0 text-[16px]" data-node-id="408:48706" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
            unfold_more
          </p>
        </div>
        <p className="font-['Material_Symbols_Rounded:Regular'] font-normal leading-none relative shrink-0 text-[16px]" data-node-id="517:16744" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
          tune
        </p>
      </div>
      <div className="[word-break:break-word] content-stretch flex gap-[var(--spacing-1,4px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-4,16px)] relative shrink-0 text-[color:var(--on-surface\/secondary,#666)] w-[146px] whitespace-nowrap" data-node-id="408:48743" data-name="Table / Header / Title + Icon">
        <p className="font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium leading-[16px] overflow-hidden relative shrink-0 text-[12px] text-ellipsis uppercase" data-node-id="408:48744">
          Stage
        </p>
        <p className="font-['Material_Symbols_Rounded:Regular'] font-normal leading-none relative shrink-0 text-[16px]" data-node-id="408:48745" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
          unfold_more
        </p>
      </div>
      <div className="content-stretch flex gap-[var(--spacing-1,4px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-4,16px)] relative shrink-0 w-[321px]" data-node-id="408:48782" data-name="Table / Header / Title + Icon">
        <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium leading-[16px] overflow-hidden relative shrink-0 text-[12px] text-[color:var(--on-surface\/secondary,#666)] text-ellipsis uppercase whitespace-nowrap" data-node-id="408:48783">
          Tasks
        </p>
      </div>
      <div className="[word-break:break-word] content-stretch flex gap-[var(--spacing-1,4px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-4,16px)] relative shrink-0 text-[color:var(--on-surface\/secondary,#666)] w-[160px] whitespace-nowrap" data-node-id="408:48821" data-name="Table / Header / Title + Icon">
        <p className="font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium leading-[16px] overflow-hidden relative shrink-0 text-[12px] text-ellipsis uppercase" data-node-id="408:48822">
          Assignees
        </p>
        <p className="font-['Material_Symbols_Rounded:Regular'] font-normal leading-none relative shrink-0 text-[16px]" data-node-id="408:48823" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
          unfold_more
        </p>
      </div>
      <div className="[word-break:break-word] content-stretch flex gap-[var(--spacing-1,4px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-4,16px)] relative shrink-0 text-[color:var(--on-surface\/secondary,#666)] w-[132px] whitespace-nowrap" data-node-id="408:48860" data-name="Table / Header / Title + Icon">
        <p className="font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium leading-[16px] overflow-hidden relative shrink-0 text-[12px] text-ellipsis uppercase" data-node-id="408:48861">
          Source
        </p>
        <p className="font-['Material_Symbols_Rounded:Regular'] font-normal leading-none relative shrink-0 text-[16px]" data-node-id="408:48862" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
          unfold_more
        </p>
      </div>
      <div className="[word-break:break-word] content-stretch flex gap-[var(--spacing-1,4px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-4,16px)] relative shrink-0 text-[color:var(--on-surface\/secondary,#666)] w-[138px] whitespace-nowrap" data-node-id="408:48899" data-name="Table / Header / Title + Icon">
        <p className="font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium leading-[16px] overflow-hidden relative shrink-0 text-[12px] text-ellipsis uppercase" data-node-id="408:48900">
          Budget (S$)
        </p>
        <p className="font-['Material_Symbols_Rounded:Regular'] font-normal leading-none relative shrink-0 text-[16px]" data-node-id="408:48901" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
          unfold_more
        </p>
      </div>
      <div className="[word-break:break-word] content-stretch flex gap-[var(--spacing-1,4px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-4,16px)] relative shrink-0 text-[color:var(--on-surface\/secondary,#666)] w-[158px] whitespace-nowrap" data-node-id="408:48938" data-name="Table / Header / Title + Icon">
        <p className="font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium leading-[16px] overflow-hidden relative shrink-0 text-[12px] text-ellipsis uppercase" data-node-id="408:48939">
          Property type
        </p>
        <p className="font-['Material_Symbols_Rounded:Regular'] font-normal leading-none relative shrink-0 text-[16px]" data-node-id="408:48940" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
          unfold_more
        </p>
      </div>
      <div className="[word-break:break-word] content-stretch flex gap-[var(--spacing-1,4px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-4,16px)] relative shrink-0 text-[color:var(--on-surface\/secondary,#666)] w-[115px] whitespace-nowrap" data-node-id="408:48977" data-name="Table / Header / Title + Icon">
        <p className="font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium leading-[16px] overflow-hidden relative shrink-0 text-[12px] text-ellipsis uppercase" data-node-id="408:48978">
          created
        </p>
        <p className="font-['Material_Symbols_Rounded:Regular'] font-normal leading-none relative shrink-0 text-[16px]" data-node-id="408:48979" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
          unfold_more
        </p>
      </div>
    </div>
  );
}

type PageHeaderLeadsL1Props = {
  className?: string;
  children?: React.ReactNode | null;
};

function PageHeaderLeadsL1({ className, children = null }: PageHeaderLeadsL1Props) {
  return (
    <div className={className || "bg-[var(--surface\\/default,white)] border-[var(--surface\\/variant,#e5e5e5)] border-b-[length:var(--border-1,1px)] border-solid content-stretch flex gap-[var(--spacing-3,12px)] items-center overflow-clip px-[var(--spacing-6,24px)] py-[var(--spacing-4,16px)] relative w-[1364px]"} data-node-id="525:72039" data-name="Page Header / Leads - L1">
      <p className="[word-break:break-word] flex-[1_0_0] font-[family-name:var(--font\/family\/inter,'Inter:Bold')] font-[var(--font\/weight\/bold,normal)] font-bold h-[24px] leading-[24px] min-w-px relative text-[color:var(--on-surface\/default,#1a1a1a)] text-[length:var(--font\/size\/xl,20px)]" data-node-id="525:72028">
        Leads
      </p>
      <div className="content-stretch flex gap-[var(--spacing-3,12px)] items-center justify-end relative shrink-0" data-node-id="525:72296" data-name="Slot">
        {children || (
          <>
            <div className="[word-break:break-word] border border-[var(--on-surface\/border,#ccc)] border-solid content-stretch flex gap-[var(--spacing-2,8px)] h-[36px] items-center justify-center pl-[var(--spacing-3,12px)] pr-[var(--spacing-4,16px)] py-[var(--spacing-2,8px)] relative rounded-[4px] shrink-0 text-[color:var(--on-surface\/secondary,#666)] text-center whitespace-nowrap" data-node-id="525:72030" data-name="Buttons">
              <p className="font-['Material_Symbols_Rounded:Regular'] font-normal leading-none relative shrink-0 text-[20px]" data-node-id="I525:72030;1360:444" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                bar_chart_4_bars
              </p>
              <div className="flex flex-col font-[family-name:var(--font\/family\/inter,'Inter:SemiBold')] font-[var(--font\/weight\/semibold,normal)] justify-center leading-[0] relative shrink-0 text-[length:var(--font\/size\/m,14px)]" data-node-id="I525:72030;1360:445">
                <p className="leading-[20px]">Insights</p>
              </div>
            </div>
            <div className="content-stretch flex flex-col gap-[var(--spacing-3,12px)] items-start relative shrink-0" data-node-id="662:36546">
              <div className="[word-break:break-word] bg-[var(--primary\/default,#50f)] content-stretch flex gap-[var(--spacing-2,8px)] h-[36px] items-center justify-center pl-[var(--spacing-3,12px)] pr-[var(--spacing-4,16px)] py-[var(--spacing-2,8px)] relative rounded-[4px] shrink-0 text-[color:var(--on-primary\/default,white)] text-center w-full whitespace-nowrap" data-node-id="662:36547" data-name="Buttons">
                <p className="font-['Material_Symbols_Rounded:Regular'] font-normal leading-none relative shrink-0 text-[20px]" data-node-id="I662:36547;1360:768" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                  add
                </p>
                <div className="flex flex-col font-[family-name:var(--font\/family\/inter,'Inter:SemiBold')] font-[var(--font\/weight\/semibold,normal)] justify-center leading-[0] relative shrink-0 text-[length:var(--font\/size\/m,14px)]" data-node-id="I662:36547;1360:769">
                  <p className="leading-[20px]">Add Lead</p>
                </div>
              </div>
            </div>
            <div className="border border-[var(--on-surface\/border,#ccc)] border-solid content-stretch flex items-center justify-center p-[var(--spacing-2,8px)] relative rounded-[4px] shrink-0 size-[36px]" data-node-id="525:72031" data-name="Icon Buttons">
              <div className="[word-break:break-word] flex flex-col font-['Material_Symbols_Rounded:Regular'] font-normal justify-center leading-[0] relative shrink-0 text-[20px] text-[color:var(--on-surface\/secondary,#666)] text-center whitespace-nowrap" data-node-id="I525:72031;1208:271" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                <p className="leading-none">more_vert</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AssignMember() {
  return (
    <div className="bg-[var(--surface\/default,white)] relative size-full" data-node-id="780:87916" data-name="Assign member">
      <div className="absolute bg-[var(--surface\/bg,#f2f2f2)] bottom-0 content-stretch flex flex-col gap-[var(--spacing-2,8px)] items-start left-0 p-[var(--spacing-2,8px)] top-0 w-[1440px]" data-node-id="780:87917" data-name="Page">
        <div className="content-stretch flex flex-[1_0_0] gap-[var(--spacing-2,8px)] items-start min-h-px relative w-full" data-node-id="780:87918" data-name="Main container">
          <div className="bg-[var(--surface\/default,white)] content-stretch flex gap-[var(--spacing-0,0px)] h-full items-start p-[var(--spacing-0,0px)] relative rounded-[var(--radius-2,8px)] shrink-0" data-node-id="780:87919" data-name="Side Nav">
            <div className="content-stretch flex flex-col h-full items-start overflow-clip p-[var(--spacing-2,8px)] relative shrink-0" data-node-id="I780:87919;6727:528" data-name="side-nav-container">
              <div className="content-stretch flex flex-[1_0_0] flex-col items-start min-h-px relative" data-node-id="I780:87919;6727:529" data-name="side-nav-top">
                <div className="content-stretch flex flex-col items-start pb-[var(--spacing-5,20px)] pt-[var(--spacing-2,8px)] px-[var(--spacing-0,0px)] relative shrink-0" data-node-id="I780:87919;6727:530" data-name="logo-container">
                  <div className="content-stretch flex items-center justify-center overflow-clip p-[var(--spacing-1,4px)] relative rounded-[var(--radius-2,8px)] shrink-0" data-node-id="I780:87919;6727:531" data-name="Side Nav / Item">
                    <div className="relative shrink-0 size-[28px]" data-node-id="I780:87919;6727:532" data-name="Logo">
                      <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgLogo} />
                    </div>
                  </div>
                </div>
                <div className="content-stretch flex flex-[1_0_0] flex-col items-start min-h-px relative" data-node-id="I780:87919;6727:535" data-name="Top Half2">
                  <div className="content-stretch flex flex-col gap-[var(--spacing-0,0px)] items-start pb-[var(--spacing-3,12px)] relative shrink-0 w-full" data-node-id="I780:87919;6727:536">
                    <div className="bg-[var(--hover\/04p,rgba(0,0,0,0.04))] content-stretch flex items-center justify-center overflow-clip p-[6px] relative rounded-[var(--radius-2,8px)] shrink-0" data-node-id="I780:87919;6727:537" data-name="Side Nav / Item">
                      <p className="[word-break:break-word] font-['Material_Symbols_Rounded:Light'] font-light leading-none relative shrink-0 text-[24px] text-[color:var(--on-surface\/secondary,#666)] whitespace-nowrap" data-node-id="I780:87919;6727:537;6721:973" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                        search
                      </p>
                    </div>
                  </div>
                  <div className="content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-2,8px)] items-start min-h-px relative w-full" data-node-id="I780:87919;6727:538" data-name="Top">
                    <div className="content-stretch flex gap-[10px] h-[36px] items-center justify-center overflow-clip p-[6px] relative shrink-0" data-node-id="I780:87919;6727:538;780:87975" data-name="Workspace">
                      <p className="[word-break:break-word] font-['Material_Symbols_Rounded:Light'] font-light leading-none relative shrink-0 text-[24px] text-[color:var(--on-surface\/default,#1a1a1a)] whitespace-nowrap" data-node-id="I780:87919;6727:538;780:87975;6721:953" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                        dashboard
                      </p>
                    </div>
                    <div className="content-stretch flex gap-[10px] h-[36px] items-center justify-center overflow-clip p-[6px] relative shrink-0" data-node-id="I780:87919;6727:538;780:87976" data-name="Catalog">
                      <p className="[word-break:break-word] font-['Material_Symbols_Rounded:Light'] font-light leading-none relative shrink-0 text-[24px] text-[color:var(--on-surface\/default,#1a1a1a)] whitespace-nowrap" data-node-id="I780:87919;6727:538;780:87976;6721:953" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                        business_center
                      </p>
                    </div>
                    <div className="bg-[var(--primary\/variant,#eee5ff)] content-stretch flex h-[36px] items-center justify-center overflow-clip p-[6px] relative rounded-[var(--radius-2,8px)] shrink-0" data-node-id="I780:87919;6727:538;780:87977" data-name="Calendar">
                      <p className="[word-break:break-word] font-['Material_Symbols_Rounded:Light'] font-light leading-none relative shrink-0 text-[24px] text-[color:var(--on-primary\/variant,#40c)] whitespace-nowrap" data-node-id="I780:87919;6727:538;780:87977;6721:993" style={{ fontVariationSettings: '"FILL" 1, "GRAD" 0' }}>
                        people_alt
                      </p>
                    </div>
                    <div className="content-stretch flex gap-[10px] h-[36px] items-center justify-center overflow-clip p-[6px] relative shrink-0" data-node-id="I780:87919;6727:538;780:87978" data-name="Reports">
                      <p className="[word-break:break-word] font-['Material_Symbols_Rounded:Light'] font-light leading-none relative shrink-0 text-[24px] text-[color:var(--on-surface\/default,#1a1a1a)] whitespace-nowrap" data-node-id="I780:87919;6727:538;780:87978;6721:953" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                        storefront
                      </p>
                    </div>
                    <div className="content-stretch flex gap-[10px] h-[36px] items-center justify-center overflow-clip p-[6px] relative shrink-0" data-node-id="I780:87919;6727:538;780:87979" data-name="Community">
                      <p className="[word-break:break-word] font-['Material_Symbols_Rounded:Light'] font-light leading-none relative shrink-0 text-[24px] text-[color:var(--on-surface\/default,#1a1a1a)] whitespace-nowrap" data-node-id="I780:87919;6727:538;780:87979;6721:953" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                        domain
                      </p>
                    </div>
                    <div className="content-stretch flex gap-[10px] h-[36px] items-center justify-center overflow-clip p-[6px] relative shrink-0" data-node-id="I780:87919;6727:538;780:87980" data-name="Orders">
                      <p className="[word-break:break-word] font-['Material_Symbols_Rounded:Light'] font-light leading-none relative shrink-0 text-[24px] text-[color:var(--on-surface\/default,#1a1a1a)] whitespace-nowrap" data-node-id="I780:87919;6727:538;780:87980;6721:953" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                        account_balance
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="content-stretch flex flex-col items-start justify-end relative shrink-0 w-full" data-node-id="I780:87919;6727:545" data-name="Bottom Half">
                <div className="content-stretch flex flex-col gap-[var(--spacing-2,8px)] items-start justify-end relative shrink-0" data-node-id="I780:87919;6727:546" data-name="Bottom">
                  <div className="bg-gradient-to-r content-stretch flex from-[rgba(214,97,66,0.1)] gap-[8px] items-center justify-center overflow-clip p-[6px] relative rounded-[var(--radius-2,8px)] shrink-0 size-[36px] to-[rgba(189,58,95,0.1)]" data-node-id="I780:87919;6759:2781" data-name="Orders">
                    <p className="[word-break:break-word] bg-clip-text bg-gradient-to-b font-['Material_Symbols_Rounded:Light'] font-light from-[#b42c69] leading-none relative shrink-0 text-[24px] text-[transparent] to-[#eb802b] whitespace-nowrap" data-node-id="I780:87919;6759:2781;6721:993" style={{ fontVariationSettings: '"FILL" 1, "GRAD" 0' }}>
                      diamond
                    </p>
                  </div>
                  <div className="content-stretch flex gap-[10px] h-[36px] items-center justify-center overflow-clip p-[6px] relative shrink-0" data-node-id="I780:87919;6727:547" data-name="Dashboard">
                    <p className="[word-break:break-word] font-['Material_Symbols_Rounded:Light'] font-light leading-none relative shrink-0 text-[24px] text-[color:var(--on-surface\/default,#1a1a1a)] whitespace-nowrap" data-node-id="I780:87919;6727:547;6721:953" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                      apps
                    </p>
                  </div>
                  <div className="content-stretch flex gap-[10px] h-[36px] items-center justify-center overflow-clip p-[6px] relative shrink-0" data-node-id="I780:87919;6727:548" data-name="Community">
                    <p className="[word-break:break-word] font-['Material_Symbols_Rounded:Light'] font-light leading-none relative shrink-0 text-[24px] text-[color:var(--on-surface\/default,#1a1a1a)] whitespace-nowrap" data-node-id="I780:87919;6727:548;6721:953" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                      chat
                    </p>
                  </div>
                  <div className="content-stretch flex gap-[10px] h-[36px] items-center justify-center overflow-clip p-[6px] relative shrink-0" data-node-id="I780:87919;6727:549" data-name="Reports">
                    <p className="[word-break:break-word] font-['Material_Symbols_Rounded:Light'] font-light leading-none relative shrink-0 text-[24px] text-[color:var(--on-surface\/default,#1a1a1a)] whitespace-nowrap" data-node-id="I780:87919;6727:549;6721:953" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                      notifications
                    </p>
                  </div>
                  <div className="content-stretch flex gap-[10px] h-[36px] items-center justify-center overflow-clip p-[6px] relative shrink-0" data-node-id="I780:87919;6727:550" data-name="Orders">
                    <p className="[word-break:break-word] font-['Material_Symbols_Rounded:Light'] font-light leading-none relative shrink-0 text-[24px] text-[color:var(--on-surface\/default,#1a1a1a)] whitespace-nowrap" data-node-id="I780:87919;6727:550;6721:953" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                      settings
                    </p>
                  </div>
                </div>
                <div className="content-stretch flex flex-col items-start justify-end pb-[var(--spacing-2,8px)] pt-[var(--spacing-5,20px)] px-[var(--spacing-0,0px)] relative shrink-0" data-node-id="I780:87919;6727:551" data-name="logo-container">
                  <div className="border border-[var(--surface\/variant,#e5e5e5)] border-solid relative rounded-[var(--radius-2,8px)] shrink-0 size-[36px]" data-node-id="I780:87919;6727:552">
                    <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none rounded-[var(--radius-2,8px)] size-full" src={imgRectangle1} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-[var(--surface\/default,white)] content-stretch flex flex-[1_0_0] flex-col h-full items-start min-w-px overflow-clip relative rounded-[var(--radius-2,8px)]" data-node-id="780:87920" data-name="body-container">
            <PageHeaderLeadsL1 className="bg-[var(--surface\/default,white)] border-[var(--surface\/variant,#e5e5e5)] border-b-[length:var(--border-1,1px)] border-solid content-stretch flex gap-[var(--spacing-3,12px)] items-center overflow-clip px-[var(--spacing-6,24px)] py-[var(--spacing-4,16px)] relative shrink-0 w-[1364px]" />
            <div className="content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-6,24px)] items-start min-h-px p-[var(--spacing-6,24px)] relative w-full" data-node-id="780:87922" data-name="Container">
              <div className="content-stretch flex gap-[var(--spacing-4,16px)] items-center py-[var(--spacing-0,0px)] relative rounded-[var(--radius-2,8px)] shrink-0 w-full" data-node-id="780:87923" data-name="Section items">
                <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-node-id="780:87924">
                  <div className="[word-break:break-word] border border-[var(--on-surface\/border,#ccc)] border-solid content-stretch flex gap-[8px] h-[36px] items-center justify-center pl-[var(--spacing-4,16px)] pr-[var(--spacing-3,12px)] py-[var(--spacing-2,8px)] relative rounded-[4px] shrink-0 text-center whitespace-nowrap" data-node-id="780:87925" data-name="Buttons">
                    <div className="flex flex-col font-[family-name:var(--font\/family\/inter,'Inter:SemiBold')] font-[var(--font\/weight\/semibold,normal)] justify-center leading-[0] relative shrink-0 text-[color:var(--on-surface\/default,#1a1a1a)] text-[length:var(--font\/size\/m,14px)]" data-node-id="780:87926">
                      <p className="leading-[20px]">All Leads (99)</p>
                    </div>
                    <p className="font-['Material_Symbols_Rounded:Regular'] font-normal leading-none relative shrink-0 text-[20px] text-[color:var(--on-surface\/secondary,#666)]" data-node-id="780:87928" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                      keyboard_arrow_down
                    </p>
                  </div>
                </div>
                <div className="content-stretch flex gap-[var(--spacing-3,12px)] items-center justify-end relative shrink-0" data-node-id="780:87929">
                  <div className="border border-[var(--on-surface\/border,#ccc)] border-solid content-stretch flex items-center justify-center p-[var(--spacing-2,8px)] relative rounded-[4px] shrink-0 size-[36px]" data-node-id="780:87930" data-name="Icon Buttons">
                    <div className="[word-break:break-word] flex flex-col font-['Material_Symbols_Rounded:Regular'] font-normal justify-center leading-[0] relative shrink-0 text-[20px] text-[color:var(--on-surface\/secondary,#666)] text-center whitespace-nowrap" data-node-id="I780:87930;1208:271" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                      <p className="leading-none">search</p>
                    </div>
                  </div>
                  <div className="border border-[var(--on-surface\/border,#ccc)] border-solid content-stretch flex items-center justify-center p-[var(--spacing-2,8px)] relative rounded-[4px] shrink-0 size-[36px]" data-node-id="780:87931" data-name="Icon Buttons">
                    <div className="[word-break:break-word] flex flex-col font-['Material_Symbols_Rounded:Regular'] font-normal justify-center leading-[0] relative shrink-0 text-[20px] text-[color:var(--on-surface\/secondary,#666)] text-center whitespace-nowrap" data-node-id="I780:87931;1208:271" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                      <p className="leading-none">filter_list</p>
                    </div>
                  </div>
                  <div className="content-stretch flex items-center relative shrink-0" data-node-id="780:87932" data-name="Segmented Icon Button">
                    <div className="bg-[var(--primary\/variant,#eee5ff)] border border-[var(--on-surface\/border,#ccc)] border-solid content-stretch flex items-center justify-center mr-[-1px] p-[var(--spacing-2,8px)] relative rounded-bl-[4px] rounded-tl-[4px] shrink-0 size-[36px]" data-node-id="I780:87932;3645:2823" data-name="Start">
                      <div className="[word-break:break-word] flex flex-col font-['Material_Symbols_Rounded:Regular'] font-normal justify-center leading-[0] relative shrink-0 text-[20px] text-[color:var(--on-primary\/variant,#40c)] text-center whitespace-nowrap" data-node-id="I780:87932;3645:2823;3645:2757" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                        <p className="leading-none">view_list</p>
                      </div>
                    </div>
                    <div className="border border-[var(--on-surface\/border,#ccc)] border-solid content-stretch flex items-center justify-center p-[var(--spacing-2,8px)] relative rounded-br-[4px] rounded-tr-[4px] shrink-0 size-[36px]" data-node-id="I780:87932;3645:2827" data-name="End">
                      <div className="[word-break:break-word] flex flex-col font-['Material_Symbols_Rounded:Regular'] font-normal justify-center leading-[0] relative shrink-0 text-[20px] text-[color:var(--on-surface\/secondary,#666)] text-center whitespace-nowrap" data-node-id="I780:87932;3645:2827;3645:2813" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                        <p className="leading-none">view_kanban</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-[var(--surface\/default,white)] border-[length:var(--border-1,1px)] border-[var(--surface\/variant,#e5e5e5)] border-solid content-stretch flex flex-col items-start overflow-clip relative rounded-[var(--radius-2,8px)] shrink-0" data-node-id="780:87933" data-name="Table">
                <TableRowLeadDefault className="content-stretch flex h-[56px] items-center relative shrink-0" />
                <div className="content-stretch flex h-[64px] items-center relative shrink-0" data-node-id="780:87935" data-name="Table / Row / Lead - Default">
                  <div className="border-[var(--surface\/variant,#e5e5e5)] border-r-[length:var(--border-2,2px)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[240px]" data-node-id="I780:87935;408:49292" data-name="Table / Cell / Two line / Text">
                    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-1,4px)] items-start min-w-px relative" data-node-id="I780:87935;408:49293" data-name="Cell Data">
                      <div className="content-stretch flex gap-[var(--spacing-1,4px)] items-center relative shrink-0" data-node-id="I780:87935;452:24851">
                        <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Bold')] font-[var(--font\/weight\/bold,normal)] font-bold leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="I780:87935;408:49296">
                          Sample Lead
                        </p>
                      </div>
                      <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[16px] min-w-full overflow-hidden relative shrink-0 text-[12px] text-[color:var(--on-surface\/secondary,#666)] text-ellipsis w-[min-content] whitespace-nowrap" data-node-id="I780:87935;408:49297">
                        9123 4567
                      </p>
                    </div>
                  </div>
                  <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[146px]" data-node-id="I780:87935;408:49706" data-name="Table / Cell / One line / Text + Trailing Icon">
                    <div className="[word-break:break-word] content-stretch flex font-normal gap-[var(--spacing-1,4px)] items-start relative shrink-0 text-[color:var(--on-surface\/default,#1a1a1a)] whitespace-nowrap" data-node-id="I780:87935;408:49707" data-name="CellDataGroup">
                      <p className="font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-ellipsis" data-node-id="I780:87935;408:49708">
                        New
                      </p>
                      <p className="font-['Material_Symbols_Rounded:Regular'] leading-none relative shrink-0 text-[20px]" data-node-id="I780:87935;408:49709" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                        keyboard_arrow_down
                      </p>
                    </div>
                  </div>
                  <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[321px]" data-node-id="I780:87935;408:53280" data-name="Table / Cell / One line / Text + Tag Vertical">
                    <div className="border border-[var(--surface\/variant,#e5e5e5)] border-solid content-stretch flex gap-[var(--spacing-2,8px)] items-center overflow-clip p-[var(--spacing-2,8px)] relative rounded-[var(--radius-1,4px)] shrink-0 w-[281px]" data-node-id="I780:87935;408:53281">
                      <p className="[word-break:break-word] flex-[1_0_0] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[20px] min-w-px overflow-hidden relative text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="I780:87935;408:53282">
                        This is a sample task added by the user
                      </p>
                    </div>
                  </div>
                  <div className="border-[length:var(--border-2,2px)] border-[var(--primary\/default,#50f)] border-solid content-stretch flex gap-[var(--spacing-3,12px)] h-[64px] items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[160px]" data-node-id="I780:87935;565:107768" data-name=".Table / Cell / Member">
                    <div className="[word-break:break-word] content-stretch flex gap-[var(--spacing-1,4px)] items-center relative shrink-0 text-[color:var(--primary\/default,#50f)] whitespace-nowrap" data-node-id="I780:87935;565:107768;565:107758" data-name="Link text">
                      <p className="font-['Material_Symbols_Rounded:Regular'] font-normal leading-none relative shrink-0 text-[20px] text-center" data-node-id="I780:87935;565:107768;565:107758;2043:1379" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                        person_add
                      </p>
                      <div className="flex flex-col font-[family-name:var(--font\/family\/inter,'Inter:SemiBold')] font-[var(--font\/weight\/semibold,normal)] justify-center leading-[0] relative shrink-0 text-[length:var(--font\/size\/m,14px)]" data-node-id="I780:87935;565:107768;565:107758;2043:1380">
                        <p className="leading-[20px]">Assign</p>
                      </div>
                    </div>
                  </div>
                  <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[132px]" data-node-id="I780:87935;408:52077" data-name="Table / Cell / One line / Source">
                    <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="I780:87935;408:52080">
                      Instagram
                    </p>
                  </div>
                  <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[138px]" data-node-id="I780:87935;408:52275" data-name="Table / Cell / One line / Text">
                    <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="I780:87935;408:52277">
                      70,500
                    </p>
                  </div>
                  <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[158px]" data-node-id="I780:87935;408:52419" data-name="Table / Cell / One line / Text">
                    <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="I780:87935;408:52421">
                      HDB 4-Room
                    </p>
                  </div>
                  <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[115px]" data-node-id="I780:87935;408:52563" data-name="Table / Cell / One line / Text">
                    <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="I780:87935;408:52565">
                      17 Jul ‘26
                    </p>
                  </div>
                  <div className="absolute bg-[var(--primary\/default,#50f)] h-[64px] left-0 top-0 w-[4px]" data-node-id="I780:87935;452:25052" />
                </div>
                <div className="content-stretch flex items-center relative shrink-0" data-node-id="780:87936" data-name="Table / Row / Lead - Default">
                  <div className="border-[var(--surface\/variant,#e5e5e5)] border-r-[length:var(--border-2,2px)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[240px]" data-node-id="I780:87936;452:24763" data-name="Table / Cell / Two line / Text">
                    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-1,4px)] items-start min-w-px relative whitespace-nowrap" data-node-id="I780:87936;452:24764" data-name="Cell Data">
                      <p className="font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis" data-node-id="I780:87936;452:24765">
                        Farah Ahmad
                      </p>
                      <p className="font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[16px] min-w-full overflow-hidden relative shrink-0 text-[12px] text-[color:var(--on-surface\/secondary,#666)] text-ellipsis w-[min-content]" data-node-id="I780:87936;452:24766">
                        9123 4567
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-row items-center self-stretch" data-node-id="I780:87936;452:24768">
                    <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[146px]" data-name="Table / Cell / One line / Text + Trailing Icon">
                      <div className="[word-break:break-word] content-stretch flex font-normal gap-[var(--spacing-1,4px)] items-start relative shrink-0 text-[color:var(--on-surface\/default,#1a1a1a)] whitespace-nowrap" data-node-id="I780:87936;452:24769" data-name="CellDataGroup">
                        <p className="font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-ellipsis" data-node-id="I780:87936;452:24770">
                          Contacted
                        </p>
                        <p className="font-['Material_Symbols_Rounded:Regular'] leading-none relative shrink-0 text-[20px]" data-node-id="I780:87936;452:24771" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                          keyboard_arrow_down
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-row items-center self-stretch" data-node-id="I780:87936;452:24772">
                    <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[321px]" data-name="Table / Cell / One line / Text + Tag Vertical">
                      <div className="border border-[var(--surface\/variant,#e5e5e5)] border-solid content-stretch flex gap-[var(--spacing-2,8px)] items-center overflow-clip p-[var(--spacing-2,8px)] relative rounded-[var(--radius-1,4px)] shrink-0 w-[281px]" data-node-id="I780:87936;452:24773">
                        <p className="[word-break:break-word] flex-[1_0_0] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[20px] min-w-px overflow-hidden relative text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="I780:87936;452:24774">
                          This is a sample task added by the user
                        </p>
                        <div className="bg-[var(--tertiary-red\/variant2,#fbebea)] border border-[var(--tertiary-red\/variant1,#f8d7d4)] border-solid content-stretch flex gap-[var(--spacing-1,4px)] items-center justify-center overflow-clip px-[var(--spacing-2,8px)] py-[var(--spacing-1,4px)] relative rounded-[4px] shrink-0" data-node-id="I780:87936;452:24775" data-name="Tag">
                          <div className="[word-break:break-word] flex flex-col font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium justify-center leading-[0] relative shrink-0 text-[color:var(--on-tertiary-red\/variant,#af2d22)] text-[length:var(--font\/size\/xs,10px)] uppercase whitespace-nowrap" data-node-id="I780:87936;452:24775;2015:2193">
                            <p className="leading-[12px]">Overdue</p>
                          </div>
                        </div>
                        <div className="bg-[var(--surface\/bg,#f2f2f2)] border border-[var(--on-surface\/border,#ccc)] border-solid content-stretch flex gap-[var(--spacing-1,4px)] items-center justify-center overflow-clip px-[var(--spacing-2,8px)] py-[var(--spacing-1,4px)] relative rounded-[4px] shrink-0" data-node-id="I780:87936;452:24776" data-name="Tag">
                          <div className="[word-break:break-word] flex flex-col font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium justify-center leading-[0] relative shrink-0 text-[color:var(--on-surface\/secondary,#666)] text-[length:var(--font\/size\/xs,10px)] uppercase whitespace-nowrap" data-node-id="I780:87936;452:24776;1059:286">
                            <p className="leading-[12px]">+2</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-row items-center self-stretch" data-node-id="I780:87936;452:24777">
                    <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[160px]" data-name=".Table / Cell / Member">
                      <div className="content-stretch flex gap-[var(--spacing-2,8px)] items-start relative shrink-0" data-node-id="I780:87936;452:24777;460:31317" data-name="Slot">
                        <div className="content-stretch flex gap-[var(--spacing-2,8px)] items-start relative shrink-0" data-node-id="I780:87936;452:24777;460:31317;460:31763" data-name="CellDataGroup">
                          <div className="relative shrink-0 size-[24px]" data-node-id="I780:87936;452:24777;460:31317;460:31764" data-name="Generic">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgSlot} />
                          </div>
                          <div className="relative shrink-0 size-[24px]" data-node-id="I780:87936;452:24777;460:31317;460:31765" data-name="Generic">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgSlot} />
                          </div>
                          <div className="border border-[var(--on-surface\/border,#ccc)] border-solid content-stretch flex items-center justify-center p-[var(--spacing-0-5,2px)] relative rounded-[4px] shrink-0 size-[24px]" data-node-id="I780:87936;452:24777;460:31317;460:31776" data-name="Icon Buttons">
                            <div className="[word-break:break-word] flex flex-col font-['Inter:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-[color:var(--on-surface\/secondary,#666)] text-center whitespace-nowrap" data-node-id="I780:87936;452:24777;460:31317;460:31776;1547:733">
                              <p className="leading-[20px]">+2</p>
                            </div>
                          </div>
                          <div className="border border-[var(--primary\/default,#50f)] border-solid content-stretch flex items-center justify-center p-[var(--spacing-0-5,2px)] relative rounded-[4px] shrink-0 size-[24px]" data-node-id="I780:87936;452:24777;460:31317;460:31766" data-name="Icon Buttons">
                            <div className="[word-break:break-word] flex flex-col font-['Material_Symbols_Rounded:Regular'] font-normal justify-center leading-[0] relative shrink-0 text-[20px] text-[color:var(--primary\/default,#50f)] text-center whitespace-nowrap" data-node-id="I780:87936;452:24777;460:31317;460:31766;1547:727" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                              <p className="leading-none">person_add</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-row items-center self-stretch" data-node-id="I780:87936;452:24778">
                    <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-8,32px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[132px]" data-name="Table / Cell / One line / Source">
                      <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="I780:87936;452:24779">
                        Instagram
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-row items-center self-stretch" data-node-id="I780:87936;452:24780">
                    <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-8,32px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[138px]" data-name="Table / Cell / One line / Text">
                      <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="I780:87936;452:24781">
                        70,500
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-row items-center self-stretch" data-node-id="I780:87936;452:24782">
                    <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-8,32px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[158px]" data-name="Table / Cell / One line / Text">
                      <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="I780:87936;452:24783">
                        HDB 4-Room
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-row items-center self-stretch" data-node-id="I780:87936;452:24784">
                    <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-8,32px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[115px]" data-name="Table / Cell / One line / Text">
                      <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="I780:87936;452:24785">
                        17 Jul ‘26
                      </p>
                    </div>
                  </div>
                </div>
                <div className="content-stretch flex items-center relative shrink-0" data-node-id="780:87937" data-name="Table / Row / Lead - Default">
                  <div className="border-[var(--surface\/variant,#e5e5e5)] border-r-[length:var(--border-2,2px)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[240px]" data-node-id="I780:87937;452:24763" data-name="Table / Cell / Two line / Text">
                    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-1,4px)] items-start min-w-px relative whitespace-nowrap" data-node-id="I780:87937;452:24764" data-name="Cell Data">
                      <p className="font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis" data-node-id="I780:87937;452:24765">
                        Muthu Vinay
                      </p>
                      <p className="font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[16px] min-w-full overflow-hidden relative shrink-0 text-[12px] text-[color:var(--on-surface\/secondary,#666)] text-ellipsis w-[min-content]" data-node-id="I780:87937;452:24766">
                        9123 4567
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-row items-center self-stretch" data-node-id="I780:87937;452:24768">
                    <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[146px]" data-name="Table / Cell / One line / Text + Trailing Icon">
                      <div className="[word-break:break-word] content-stretch flex font-normal gap-[var(--spacing-1,4px)] items-start relative shrink-0 text-[color:var(--on-surface\/default,#1a1a1a)] whitespace-nowrap" data-node-id="I780:87937;452:24769" data-name="CellDataGroup">
                        <p className="font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-ellipsis" data-node-id="I780:87937;452:24770">
                          Contacted
                        </p>
                        <p className="font-['Material_Symbols_Rounded:Regular'] leading-none relative shrink-0 text-[20px]" data-node-id="I780:87937;452:24771" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                          keyboard_arrow_down
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-row items-center self-stretch" data-node-id="I780:87937;452:24772">
                    <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[321px]" data-name="Table / Cell / One line / Text + Tag Vertical">
                      <div className="border border-[var(--surface\/variant,#e5e5e5)] border-solid content-stretch flex gap-[var(--spacing-2,8px)] items-center overflow-clip p-[var(--spacing-2,8px)] relative rounded-[var(--radius-1,4px)] shrink-0 w-[281px]" data-node-id="I780:87937;452:24773">
                        <p className="[word-break:break-word] flex-[1_0_0] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[20px] min-w-px overflow-hidden relative text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="I780:87937;452:24774">
                          This is a sample task added by the user
                        </p>
                        <div className="bg-[var(--tertiary-red\/variant2,#fbebea)] border border-[var(--tertiary-red\/variant1,#f8d7d4)] border-solid content-stretch flex gap-[var(--spacing-1,4px)] items-center justify-center overflow-clip px-[var(--spacing-2,8px)] py-[var(--spacing-1,4px)] relative rounded-[4px] shrink-0" data-node-id="I780:87937;452:24775" data-name="Tag">
                          <div className="[word-break:break-word] flex flex-col font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium justify-center leading-[0] relative shrink-0 text-[color:var(--on-tertiary-red\/variant,#af2d22)] text-[length:var(--font\/size\/xs,10px)] uppercase whitespace-nowrap" data-node-id="I780:87937;452:24775;2015:2193">
                            <p className="leading-[12px]">Overdue</p>
                          </div>
                        </div>
                        <div className="bg-[var(--surface\/bg,#f2f2f2)] border border-[var(--on-surface\/border,#ccc)] border-solid content-stretch flex gap-[var(--spacing-1,4px)] items-center justify-center overflow-clip px-[var(--spacing-2,8px)] py-[var(--spacing-1,4px)] relative rounded-[4px] shrink-0" data-node-id="I780:87937;452:24776" data-name="Tag">
                          <div className="[word-break:break-word] flex flex-col font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium justify-center leading-[0] relative shrink-0 text-[color:var(--on-surface\/secondary,#666)] text-[length:var(--font\/size\/xs,10px)] uppercase whitespace-nowrap" data-node-id="I780:87937;452:24776;1059:286">
                            <p className="leading-[12px]">+2</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-row items-center self-stretch" data-node-id="I780:87937;452:24777">
                    <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[160px]" data-name=".Table / Cell / Member">
                      <div className="content-stretch flex gap-[var(--spacing-2,8px)] items-start relative shrink-0" data-node-id="I780:87937;452:24777;460:31317" data-name="Slot">
                        <div className="content-stretch flex gap-[var(--spacing-2,8px)] items-start relative shrink-0" data-node-id="I780:87937;452:24777;460:31317;460:31763" data-name="CellDataGroup">
                          <div className="relative shrink-0 size-[24px]" data-node-id="I780:87937;452:24777;460:31317;460:31764" data-name="Generic">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgSlot} />
                          </div>
                          <div className="relative shrink-0 size-[24px]" data-node-id="I780:87937;452:24777;460:31317;460:31765" data-name="Generic">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgSlot} />
                          </div>
                          <div className="border border-[var(--on-surface\/border,#ccc)] border-solid content-stretch flex items-center justify-center p-[var(--spacing-0-5,2px)] relative rounded-[4px] shrink-0 size-[24px]" data-node-id="I780:87937;452:24777;460:31317;460:31776" data-name="Icon Buttons">
                            <div className="[word-break:break-word] flex flex-col font-['Inter:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-[color:var(--on-surface\/secondary,#666)] text-center whitespace-nowrap" data-node-id="I780:87937;452:24777;460:31317;460:31776;1547:733">
                              <p className="leading-[20px]">+2</p>
                            </div>
                          </div>
                          <div className="border border-[var(--primary\/default,#50f)] border-solid content-stretch flex items-center justify-center p-[var(--spacing-0-5,2px)] relative rounded-[4px] shrink-0 size-[24px]" data-node-id="I780:87937;452:24777;460:31317;460:31766" data-name="Icon Buttons">
                            <div className="[word-break:break-word] flex flex-col font-['Material_Symbols_Rounded:Regular'] font-normal justify-center leading-[0] relative shrink-0 text-[20px] text-[color:var(--primary\/default,#50f)] text-center whitespace-nowrap" data-node-id="I780:87937;452:24777;460:31317;460:31766;1547:727" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                              <p className="leading-none">person_add</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-row items-center self-stretch" data-node-id="I780:87937;452:24778">
                    <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-8,32px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[132px]" data-name="Table / Cell / One line / Source">
                      <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="I780:87937;452:24779">
                        Instagram
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-row items-center self-stretch" data-node-id="I780:87937;452:24780">
                    <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-8,32px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[138px]" data-name="Table / Cell / One line / Text">
                      <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="I780:87937;452:24781">
                        70,500
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-row items-center self-stretch" data-node-id="I780:87937;452:24782">
                    <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-8,32px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[158px]" data-name="Table / Cell / One line / Text">
                      <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="I780:87937;452:24783">
                        HDB 4-Room
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-row items-center self-stretch" data-node-id="I780:87937;452:24784">
                    <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-8,32px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[115px]" data-name="Table / Cell / One line / Text">
                      <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="I780:87937;452:24785">
                        17 Jul ‘26
                      </p>
                    </div>
                  </div>
                </div>
                <div className="content-stretch flex items-center relative shrink-0" data-node-id="780:87938" data-name="Table / Row / Lead - Default">
                  <div className="border-[var(--surface\/variant,#e5e5e5)] border-r-[length:var(--border-2,2px)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[240px]" data-node-id="I780:87938;452:24763" data-name="Table / Cell / Two line / Text">
                    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-1,4px)] items-start min-w-px relative whitespace-nowrap" data-node-id="I780:87938;452:24764" data-name="Cell Data">
                      <p className="font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis" data-node-id="I780:87938;452:24765">
                        Gerald Tan
                      </p>
                      <p className="font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[16px] min-w-full overflow-hidden relative shrink-0 text-[12px] text-[color:var(--on-surface\/secondary,#666)] text-ellipsis w-[min-content]" data-node-id="I780:87938;452:24766">
                        9123 4567
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-row items-center self-stretch" data-node-id="I780:87938;452:24768">
                    <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[146px]" data-name="Table / Cell / One line / Text + Trailing Icon">
                      <div className="[word-break:break-word] content-stretch flex font-normal gap-[var(--spacing-1,4px)] items-start relative shrink-0 text-[color:var(--on-surface\/default,#1a1a1a)] whitespace-nowrap" data-node-id="I780:87938;452:24769" data-name="CellDataGroup">
                        <p className="font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-ellipsis" data-node-id="I780:87938;452:24770">
                          Contacted
                        </p>
                        <p className="font-['Material_Symbols_Rounded:Regular'] leading-none relative shrink-0 text-[20px]" data-node-id="I780:87938;452:24771" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                          keyboard_arrow_down
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-row items-center self-stretch" data-node-id="I780:87938;452:24772">
                    <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[321px]" data-name="Table / Cell / One line / Text + Tag Vertical">
                      <div className="border border-[var(--surface\/variant,#e5e5e5)] border-solid content-stretch flex gap-[var(--spacing-2,8px)] items-center overflow-clip p-[var(--spacing-2,8px)] relative rounded-[var(--radius-1,4px)] shrink-0 w-[281px]" data-node-id="I780:87938;452:24773">
                        <p className="[word-break:break-word] flex-[1_0_0] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[20px] min-w-px overflow-hidden relative text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="I780:87938;452:24774">
                          This is a sample task added by the user
                        </p>
                        <div className="bg-[var(--tertiary-red\/variant2,#fbebea)] border border-[var(--tertiary-red\/variant1,#f8d7d4)] border-solid content-stretch flex gap-[var(--spacing-1,4px)] items-center justify-center overflow-clip px-[var(--spacing-2,8px)] py-[var(--spacing-1,4px)] relative rounded-[4px] shrink-0" data-node-id="I780:87938;452:24775" data-name="Tag">
                          <div className="[word-break:break-word] flex flex-col font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium justify-center leading-[0] relative shrink-0 text-[color:var(--on-tertiary-red\/variant,#af2d22)] text-[length:var(--font\/size\/xs,10px)] uppercase whitespace-nowrap" data-node-id="I780:87938;452:24775;2015:2193">
                            <p className="leading-[12px]">Overdue</p>
                          </div>
                        </div>
                        <div className="bg-[var(--surface\/bg,#f2f2f2)] border border-[var(--on-surface\/border,#ccc)] border-solid content-stretch flex gap-[var(--spacing-1,4px)] items-center justify-center overflow-clip px-[var(--spacing-2,8px)] py-[var(--spacing-1,4px)] relative rounded-[4px] shrink-0" data-node-id="I780:87938;452:24776" data-name="Tag">
                          <div className="[word-break:break-word] flex flex-col font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium justify-center leading-[0] relative shrink-0 text-[color:var(--on-surface\/secondary,#666)] text-[length:var(--font\/size\/xs,10px)] uppercase whitespace-nowrap" data-node-id="I780:87938;452:24776;1059:286">
                            <p className="leading-[12px]">+2</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-row items-center self-stretch" data-node-id="I780:87938;452:24777">
                    <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[160px]" data-name=".Table / Cell / Member">
                      <div className="content-stretch flex gap-[var(--spacing-2,8px)] items-start relative shrink-0" data-node-id="I780:87938;452:24777;460:31317" data-name="Slot">
                        <div className="content-stretch flex gap-[var(--spacing-2,8px)] items-start relative shrink-0" data-node-id="I780:87938;452:24777;460:31317;460:31763" data-name="CellDataGroup">
                          <div className="relative shrink-0 size-[24px]" data-node-id="I780:87938;452:24777;460:31317;460:31764" data-name="Generic">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgSlot} />
                          </div>
                          <div className="relative shrink-0 size-[24px]" data-node-id="I780:87938;452:24777;460:31317;460:31765" data-name="Generic">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgSlot} />
                          </div>
                          <div className="border border-[var(--on-surface\/border,#ccc)] border-solid content-stretch flex items-center justify-center p-[var(--spacing-0-5,2px)] relative rounded-[4px] shrink-0 size-[24px]" data-node-id="I780:87938;452:24777;460:31317;460:31776" data-name="Icon Buttons">
                            <div className="[word-break:break-word] flex flex-col font-['Inter:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-[color:var(--on-surface\/secondary,#666)] text-center whitespace-nowrap" data-node-id="I780:87938;452:24777;460:31317;460:31776;1547:733">
                              <p className="leading-[20px]">+2</p>
                            </div>
                          </div>
                          <div className="border border-[var(--primary\/default,#50f)] border-solid content-stretch flex items-center justify-center p-[var(--spacing-0-5,2px)] relative rounded-[4px] shrink-0 size-[24px]" data-node-id="I780:87938;452:24777;460:31317;460:31766" data-name="Icon Buttons">
                            <div className="[word-break:break-word] flex flex-col font-['Material_Symbols_Rounded:Regular'] font-normal justify-center leading-[0] relative shrink-0 text-[20px] text-[color:var(--primary\/default,#50f)] text-center whitespace-nowrap" data-node-id="I780:87938;452:24777;460:31317;460:31766;1547:727" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                              <p className="leading-none">person_add</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-row items-center self-stretch" data-node-id="I780:87938;452:24778">
                    <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-8,32px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[132px]" data-name="Table / Cell / One line / Source">
                      <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="I780:87938;452:24779">
                        Instagram
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-row items-center self-stretch" data-node-id="I780:87938;452:24780">
                    <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-8,32px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[138px]" data-name="Table / Cell / One line / Text">
                      <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="I780:87938;452:24781">
                        70,500
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-row items-center self-stretch" data-node-id="I780:87938;452:24782">
                    <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-8,32px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[158px]" data-name="Table / Cell / One line / Text">
                      <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="I780:87938;452:24783">
                        HDB 4-Room
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-row items-center self-stretch" data-node-id="I780:87938;452:24784">
                    <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-8,32px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[115px]" data-name="Table / Cell / One line / Text">
                      <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="I780:87938;452:24785">
                        17 Jul ‘26
                      </p>
                    </div>
                  </div>
                </div>
                <div className="content-stretch flex items-center relative shrink-0" data-node-id="780:87939" data-name="Table / Row / Lead - Default">
                  <div className="border-[var(--surface\/variant,#e5e5e5)] border-r-[length:var(--border-2,2px)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[240px]" data-node-id="I780:87939;452:24763" data-name="Table / Cell / Two line / Text">
                    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-1,4px)] items-start min-w-px relative whitespace-nowrap" data-node-id="I780:87939;452:24764" data-name="Cell Data">
                      <p className="font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis" data-node-id="I780:87939;452:24765">
                        Vivien Lee
                      </p>
                      <p className="font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[16px] min-w-full overflow-hidden relative shrink-0 text-[12px] text-[color:var(--on-surface\/secondary,#666)] text-ellipsis w-[min-content]" data-node-id="I780:87939;452:24766">
                        9123 4567
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-row items-center self-stretch" data-node-id="I780:87939;452:24768">
                    <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[146px]" data-name="Table / Cell / One line / Text + Trailing Icon">
                      <div className="[word-break:break-word] content-stretch flex font-normal gap-[var(--spacing-1,4px)] items-start relative shrink-0 text-[color:var(--on-surface\/default,#1a1a1a)] whitespace-nowrap" data-node-id="I780:87939;452:24769" data-name="CellDataGroup">
                        <p className="font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-ellipsis" data-node-id="I780:87939;452:24770">
                          Contacted
                        </p>
                        <p className="font-['Material_Symbols_Rounded:Regular'] leading-none relative shrink-0 text-[20px]" data-node-id="I780:87939;452:24771" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                          keyboard_arrow_down
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-row items-center self-stretch" data-node-id="I780:87939;452:24772">
                    <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[321px]" data-name="Table / Cell / One line / Text + Tag Vertical">
                      <div className="border border-[var(--surface\/variant,#e5e5e5)] border-solid content-stretch flex gap-[var(--spacing-2,8px)] items-center overflow-clip p-[var(--spacing-2,8px)] relative rounded-[var(--radius-1,4px)] shrink-0 w-[281px]" data-node-id="I780:87939;452:24773">
                        <p className="[word-break:break-word] flex-[1_0_0] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[20px] min-w-px overflow-hidden relative text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="I780:87939;452:24774">
                          This is a sample task added by the user
                        </p>
                        <div className="bg-[var(--tertiary-red\/variant2,#fbebea)] border border-[var(--tertiary-red\/variant1,#f8d7d4)] border-solid content-stretch flex gap-[var(--spacing-1,4px)] items-center justify-center overflow-clip px-[var(--spacing-2,8px)] py-[var(--spacing-1,4px)] relative rounded-[4px] shrink-0" data-node-id="I780:87939;452:24775" data-name="Tag">
                          <div className="[word-break:break-word] flex flex-col font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium justify-center leading-[0] relative shrink-0 text-[color:var(--on-tertiary-red\/variant,#af2d22)] text-[length:var(--font\/size\/xs,10px)] uppercase whitespace-nowrap" data-node-id="I780:87939;452:24775;2015:2193">
                            <p className="leading-[12px]">Overdue</p>
                          </div>
                        </div>
                        <div className="bg-[var(--surface\/bg,#f2f2f2)] border border-[var(--on-surface\/border,#ccc)] border-solid content-stretch flex gap-[var(--spacing-1,4px)] items-center justify-center overflow-clip px-[var(--spacing-2,8px)] py-[var(--spacing-1,4px)] relative rounded-[4px] shrink-0" data-node-id="I780:87939;452:24776" data-name="Tag">
                          <div className="[word-break:break-word] flex flex-col font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium justify-center leading-[0] relative shrink-0 text-[color:var(--on-surface\/secondary,#666)] text-[length:var(--font\/size\/xs,10px)] uppercase whitespace-nowrap" data-node-id="I780:87939;452:24776;1059:286">
                            <p className="leading-[12px]">+2</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-row items-center self-stretch" data-node-id="I780:87939;452:24777">
                    <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[160px]" data-name=".Table / Cell / Member">
                      <div className="content-stretch flex gap-[var(--spacing-2,8px)] items-start relative shrink-0" data-node-id="I780:87939;452:24777;460:31317" data-name="Slot">
                        <div className="content-stretch flex gap-[var(--spacing-2,8px)] items-start relative shrink-0" data-node-id="I780:87939;452:24777;460:31317;460:31763" data-name="CellDataGroup">
                          <div className="relative shrink-0 size-[24px]" data-node-id="I780:87939;452:24777;460:31317;460:31764" data-name="Generic">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgSlot} />
                          </div>
                          <div className="relative shrink-0 size-[24px]" data-node-id="I780:87939;452:24777;460:31317;460:31765" data-name="Generic">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgSlot} />
                          </div>
                          <div className="border border-[var(--on-surface\/border,#ccc)] border-solid content-stretch flex items-center justify-center p-[var(--spacing-0-5,2px)] relative rounded-[4px] shrink-0 size-[24px]" data-node-id="I780:87939;452:24777;460:31317;460:31776" data-name="Icon Buttons">
                            <div className="[word-break:break-word] flex flex-col font-['Inter:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-[color:var(--on-surface\/secondary,#666)] text-center whitespace-nowrap" data-node-id="I780:87939;452:24777;460:31317;460:31776;1547:733">
                              <p className="leading-[20px]">+2</p>
                            </div>
                          </div>
                          <div className="border border-[var(--primary\/default,#50f)] border-solid content-stretch flex items-center justify-center p-[var(--spacing-0-5,2px)] relative rounded-[4px] shrink-0 size-[24px]" data-node-id="I780:87939;452:24777;460:31317;460:31766" data-name="Icon Buttons">
                            <div className="[word-break:break-word] flex flex-col font-['Material_Symbols_Rounded:Regular'] font-normal justify-center leading-[0] relative shrink-0 text-[20px] text-[color:var(--primary\/default,#50f)] text-center whitespace-nowrap" data-node-id="I780:87939;452:24777;460:31317;460:31766;1547:727" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                              <p className="leading-none">person_add</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-row items-center self-stretch" data-node-id="I780:87939;452:24778">
                    <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-8,32px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[132px]" data-name="Table / Cell / One line / Source">
                      <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="I780:87939;452:24779">
                        Instagram
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-row items-center self-stretch" data-node-id="I780:87939;452:24780">
                    <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-8,32px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[138px]" data-name="Table / Cell / One line / Text">
                      <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="I780:87939;452:24781">
                        70,500
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-row items-center self-stretch" data-node-id="I780:87939;452:24782">
                    <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-8,32px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[158px]" data-name="Table / Cell / One line / Text">
                      <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="I780:87939;452:24783">
                        HDB 4-Room
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-row items-center self-stretch" data-node-id="I780:87939;452:24784">
                    <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-8,32px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[115px]" data-name="Table / Cell / One line / Text">
                      <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="I780:87939;452:24785">
                        17 Jul ‘26
                      </p>
                    </div>
                  </div>
                </div>
                <div className="content-stretch flex items-center relative shrink-0" data-node-id="780:87940" data-name="Table / Row / Lead - Default">
                  <div className="border-[var(--surface\/variant,#e5e5e5)] border-r-[length:var(--border-2,2px)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[240px]" data-node-id="I780:87940;452:24763" data-name="Table / Cell / Two line / Text">
                    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-1,4px)] items-start min-w-px relative whitespace-nowrap" data-node-id="I780:87940;452:24764" data-name="Cell Data">
                      <p className="font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis" data-node-id="I780:87940;452:24765">
                        Vivien Lee
                      </p>
                      <p className="font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[16px] min-w-full overflow-hidden relative shrink-0 text-[12px] text-[color:var(--on-surface\/secondary,#666)] text-ellipsis w-[min-content]" data-node-id="I780:87940;452:24766">
                        9123 4567
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-row items-center self-stretch" data-node-id="I780:87940;452:24768">
                    <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[146px]" data-name="Table / Cell / One line / Text + Trailing Icon">
                      <div className="[word-break:break-word] content-stretch flex font-normal gap-[var(--spacing-1,4px)] items-start relative shrink-0 text-[color:var(--on-surface\/default,#1a1a1a)] whitespace-nowrap" data-node-id="I780:87940;452:24769" data-name="CellDataGroup">
                        <p className="font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-ellipsis" data-node-id="I780:87940;452:24770">
                          Contacted
                        </p>
                        <p className="font-['Material_Symbols_Rounded:Regular'] leading-none relative shrink-0 text-[20px]" data-node-id="I780:87940;452:24771" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                          keyboard_arrow_down
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-row items-center self-stretch" data-node-id="I780:87940;452:24772">
                    <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[321px]" data-name="Table / Cell / One line / Text + Tag Vertical">
                      <div className="border border-[var(--surface\/variant,#e5e5e5)] border-solid content-stretch flex gap-[var(--spacing-2,8px)] items-center overflow-clip p-[var(--spacing-2,8px)] relative rounded-[var(--radius-1,4px)] shrink-0 w-[281px]" data-node-id="I780:87940;452:24773">
                        <p className="[word-break:break-word] flex-[1_0_0] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[20px] min-w-px overflow-hidden relative text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="I780:87940;452:24774">
                          This is a sample task added by the user
                        </p>
                        <div className="bg-[var(--tertiary-red\/variant2,#fbebea)] border border-[var(--tertiary-red\/variant1,#f8d7d4)] border-solid content-stretch flex gap-[var(--spacing-1,4px)] items-center justify-center overflow-clip px-[var(--spacing-2,8px)] py-[var(--spacing-1,4px)] relative rounded-[4px] shrink-0" data-node-id="I780:87940;452:24775" data-name="Tag">
                          <div className="[word-break:break-word] flex flex-col font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium justify-center leading-[0] relative shrink-0 text-[color:var(--on-tertiary-red\/variant,#af2d22)] text-[length:var(--font\/size\/xs,10px)] uppercase whitespace-nowrap" data-node-id="I780:87940;452:24775;2015:2193">
                            <p className="leading-[12px]">Overdue</p>
                          </div>
                        </div>
                        <div className="bg-[var(--surface\/bg,#f2f2f2)] border border-[var(--on-surface\/border,#ccc)] border-solid content-stretch flex gap-[var(--spacing-1,4px)] items-center justify-center overflow-clip px-[var(--spacing-2,8px)] py-[var(--spacing-1,4px)] relative rounded-[4px] shrink-0" data-node-id="I780:87940;452:24776" data-name="Tag">
                          <div className="[word-break:break-word] flex flex-col font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium justify-center leading-[0] relative shrink-0 text-[color:var(--on-surface\/secondary,#666)] text-[length:var(--font\/size\/xs,10px)] uppercase whitespace-nowrap" data-node-id="I780:87940;452:24776;1059:286">
                            <p className="leading-[12px]">+2</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-row items-center self-stretch" data-node-id="I780:87940;452:24777">
                    <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[160px]" data-name=".Table / Cell / Member">
                      <div className="content-stretch flex gap-[var(--spacing-2,8px)] items-start relative shrink-0" data-node-id="I780:87940;452:24777;460:31317" data-name="Slot">
                        <div className="content-stretch flex gap-[var(--spacing-2,8px)] items-start relative shrink-0" data-node-id="I780:87940;452:24777;460:31317;460:31763" data-name="CellDataGroup">
                          <div className="relative shrink-0 size-[24px]" data-node-id="I780:87940;452:24777;460:31317;460:31764" data-name="Generic">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgSlot} />
                          </div>
                          <div className="relative shrink-0 size-[24px]" data-node-id="I780:87940;452:24777;460:31317;460:31765" data-name="Generic">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgSlot} />
                          </div>
                          <div className="border border-[var(--on-surface\/border,#ccc)] border-solid content-stretch flex items-center justify-center p-[var(--spacing-0-5,2px)] relative rounded-[4px] shrink-0 size-[24px]" data-node-id="I780:87940;452:24777;460:31317;460:31776" data-name="Icon Buttons">
                            <div className="[word-break:break-word] flex flex-col font-['Inter:SemiBold'] justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-[color:var(--on-surface\/secondary,#666)] text-center whitespace-nowrap" data-node-id="I780:87940;452:24777;460:31317;460:31776;1547:733">
                              <p className="leading-[20px]">+2</p>
                            </div>
                          </div>
                          <div className="border border-[var(--primary\/default,#50f)] border-solid content-stretch flex items-center justify-center p-[var(--spacing-0-5,2px)] relative rounded-[4px] shrink-0 size-[24px]" data-node-id="I780:87940;452:24777;460:31317;460:31766" data-name="Icon Buttons">
                            <div className="[word-break:break-word] flex flex-col font-['Material_Symbols_Rounded:Regular'] font-normal justify-center leading-[0] relative shrink-0 text-[20px] text-[color:var(--primary\/default,#50f)] text-center whitespace-nowrap" data-node-id="I780:87940;452:24777;460:31317;460:31766;1547:727" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                              <p className="leading-none">person_add</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-row items-center self-stretch" data-node-id="I780:87940;452:24778">
                    <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-8,32px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[132px]" data-name="Table / Cell / One line / Source">
                      <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="I780:87940;452:24779">
                        Instagram
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-row items-center self-stretch" data-node-id="I780:87940;452:24780">
                    <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-8,32px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[138px]" data-name="Table / Cell / One line / Text">
                      <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="I780:87940;452:24781">
                        70,500
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-row items-center self-stretch" data-node-id="I780:87940;452:24782">
                    <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-8,32px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[158px]" data-name="Table / Cell / One line / Text">
                      <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="I780:87940;452:24783">
                        HDB 4-Room
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-row items-center self-stretch" data-node-id="I780:87940;452:24784">
                    <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-8,32px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[115px]" data-name="Table / Cell / One line / Text">
                      <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="I780:87940;452:24785">
                        17 Jul ‘26
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-[24px] right-[24px] size-[48px]" data-node-id="780:87941" data-name="Maison AI">
        <div className="absolute inset-[-16.67%_-41.67%_-83.33%_-41.67%]">
          <img alt="" className="block max-w-none size-full" src={imgMaisonAi} />
        </div>
      </div>
      <div className="-translate-x-1/2 absolute bg-[var(--surface\/default,white)] border-[length:var(--border-1,1px)] border-[var(--surface\/variant,#e5e5e5)] border-solid content-stretch flex flex-col items-start left-[calc(50%+279px)] overflow-clip rounded-[var(--radius-1,4px)] shadow-[0px_4px_6px_-2px_rgba(0,0,0,0.05),0px_10px_15px_-3px_rgba(0,0,0,0.1)] size-[400px] top-[280px]" data-node-id="780:87942" data-name="ModalComponent">
        <div className="bg-[var(--surface\/default,white)] border-[var(--surface\/variant,#e5e5e5)] border-b border-solid content-stretch flex gap-[16px] items-start pl-[var(--spacing-6,24px)] pr-[var(--spacing-4,16px)] py-[var(--spacing-4,16px)] relative shrink-0 w-full" data-node-id="780:87943" data-name="Heading">
          <p className="[word-break:break-word] flex-[1_0_0] font-[family-name:var(--font\/family\/inter,'Inter:Bold')] font-[var(--font\/weight\/bold,normal)] font-bold leading-[24px] min-w-px relative text-[color:var(--on-surface\/default,#1a1a1a)] text-[length:var(--font\/size\/xl,20px)]" data-node-id="780:87944">
            Assign Member
          </p>
          <div className="content-stretch flex items-center justify-center overflow-clip relative rounded-[4.8px] shrink-0" data-node-id="780:87945" data-name="Link Icon">
            <p className="[word-break:break-word] font-['Material_Symbols_Outlined:Regular'] leading-none not-italic relative shrink-0 text-[24px] text-[color:var(--on-surface\/secondary,#666)] text-center whitespace-nowrap" data-node-id="I780:87945;2043:1548">
              close
            </p>
          </div>
        </div>
        <div className="content-stretch flex flex-[1_0_0] items-start min-h-px relative w-full" data-node-id="780:87946" data-name="modal-body">
          <div className="bg-[var(--surface\/default,white)] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-4,16px)] h-full items-start min-w-px p-[var(--spacing-6,24px)] relative" data-node-id="780:87958" data-name="Filter content">
            <div className="content-stretch flex flex-col gap-[var(--spacing-2,8px)] items-start relative shrink-0 w-full" data-node-id="780:87959" data-name="Member list">
              <div className="content-stretch flex flex-col gap-[var(--spacing-0,0px)] items-start relative shrink-0 w-full" data-node-id="780:87960">
                <div className="content-stretch flex gap-[var(--spacing-3,12px)] items-center overflow-clip px-[var(--spacing-0,0px)] py-[var(--spacing-3,12px)] relative shrink-0 w-full" data-node-id="780:87961" data-name="Two Line">
                  <div className="relative shrink-0 size-[40px]" data-node-id="I780:87961;1996:12040" data-name="Generic">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGeneric} />
                  </div>
                  <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal gap-[4px] items-start min-w-px relative" data-node-id="I780:87961;1126:357" data-name="List Items">
                    <p className="leading-[20px] relative shrink-0 text-[color:var(--on-surface\/default,#1a1a1a)] text-[length:var(--font\/size\/m,14px)] w-full" data-node-id="I780:87961;1126:358">
                      Dane
                    </p>
                    <p className="leading-[16px] relative shrink-0 text-[color:var(--on-surface\/secondary,#666)] text-[length:var(--font\/size\/s,12px)] w-full" data-node-id="I780:87961;1126:359">
                      Owner (you)
                    </p>
                  </div>
                  <div className="content-stretch flex items-center justify-center overflow-clip relative rounded-[4px] shrink-0" data-node-id="I780:87961;2434:1718" data-name="Trailing Icon">
                    <p className="[word-break:break-word] font-['Material_Symbols_Rounded:Regular'] font-normal leading-none relative shrink-0 text-[20px] text-[color:var(--on-surface\/secondary,#666)] text-center whitespace-nowrap" data-node-id="I780:87961;2434:1718;2043:1548" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                      more_vert
                    </p>
                  </div>
                </div>
                <div className="content-stretch flex gap-[var(--spacing-3,12px)] items-center overflow-clip px-[var(--spacing-0,0px)] py-[var(--spacing-3,12px)] relative shrink-0 w-full" data-node-id="780:87962" data-name="Two Line">
                  <div className="relative shrink-0 size-[40px]" data-node-id="I780:87962;1996:12040" data-name="Generic">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGeneric} />
                  </div>
                  <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal gap-[4px] items-start min-w-px relative" data-node-id="I780:87962;1126:357" data-name="List Items">
                    <p className="leading-[20px] relative shrink-0 text-[color:var(--on-surface\/default,#1a1a1a)] text-[length:var(--font\/size\/m,14px)] w-full" data-node-id="I780:87962;1126:358">
                      James
                    </p>
                    <p className="leading-[16px] relative shrink-0 text-[color:var(--on-surface\/secondary,#666)] text-[length:var(--font\/size\/s,12px)] w-full" data-node-id="I780:87962;1126:359">
                      Designer
                    </p>
                  </div>
                  <div className="content-stretch flex items-center justify-center overflow-clip relative rounded-[4px] shrink-0" data-node-id="I780:87962;2434:1718" data-name="Trailing Icon">
                    <p className="[word-break:break-word] font-['Material_Symbols_Rounded:Regular'] font-normal leading-none relative shrink-0 text-[20px] text-[color:var(--on-surface\/secondary,#666)] text-center whitespace-nowrap" data-node-id="I780:87962;2434:1718;2043:1548" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                      more_vert
                    </p>
                  </div>
                </div>
                <div className="content-stretch flex gap-[var(--spacing-3,12px)] items-center overflow-clip px-[var(--spacing-0,0px)] py-[var(--spacing-3,12px)] relative shrink-0 w-full" data-node-id="780:87963" data-name="Two Line">
                  <div className="relative shrink-0 size-[40px]" data-node-id="I780:87963;1996:12040" data-name="Generic">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGeneric} />
                  </div>
                  <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col font-[family-name:var(--font\/family\/inter,'Roboto:Regular')] font-normal gap-[4px] items-start min-w-px relative" data-node-id="I780:87963;1126:357" data-name="List Items">
                    <p className="leading-[20px] relative shrink-0 text-[color:var(--on-surface\/default,#1a1a1a)] text-[length:var(--font\/size\/m,14px)] w-full" data-node-id="I780:87963;1126:358" style={{ fontVariationSettings: '"wdth" 100' }}>
                      Sarah
                    </p>
                    <p className="leading-[16px] relative shrink-0 text-[color:var(--on-surface\/secondary,#666)] text-[length:var(--font\/size\/s,12px)] w-full" data-node-id="I780:87963;1126:359" style={{ fontVariationSettings: '"wdth" 100' }}>
                      Designer
                    </p>
                  </div>
                  <div className="content-stretch flex items-center justify-center overflow-clip relative rounded-[4px] shrink-0" data-node-id="I780:87963;2434:1718" data-name="Trailing Icon">
                    <p className="[word-break:break-word] font-['Material_Symbols_Rounded:Regular'] font-normal leading-none relative shrink-0 text-[20px] text-[color:var(--on-surface\/secondary,#666)] text-center whitespace-nowrap" data-node-id="I780:87963;2434:1718;2043:1548" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                      more_vert
                    </p>
                  </div>
                </div>
                <div className="content-stretch flex gap-[var(--spacing-3,12px)] items-center overflow-clip px-[var(--spacing-0,0px)] py-[var(--spacing-3,12px)] relative shrink-0 w-full" data-node-id="780:87964" data-name="Two Line">
                  <div className="relative shrink-0 size-[40px]" data-node-id="I780:87964;1996:12040" data-name="Generic">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGeneric} />
                  </div>
                  <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col font-[family-name:var(--font\/family\/inter,'Roboto:Regular')] font-normal gap-[4px] items-start min-w-px relative" data-node-id="I780:87964;1126:357" data-name="List Items">
                    <p className="leading-[20px] relative shrink-0 text-[color:var(--on-surface\/default,#1a1a1a)] text-[length:var(--font\/size\/m,14px)] w-full" data-node-id="I780:87964;1126:358" style={{ fontVariationSettings: '"wdth" 100' }}>
                      Michelle
                    </p>
                    <p className="leading-[16px] relative shrink-0 text-[color:var(--on-surface\/secondary,#666)] text-[length:var(--font\/size\/s,12px)] w-full" data-node-id="I780:87964;1126:359" style={{ fontVariationSettings: '"wdth" 100' }}>
                      Designer
                    </p>
                  </div>
                  <div className="content-stretch flex items-center justify-center overflow-clip relative rounded-[4px] shrink-0" data-node-id="I780:87964;2434:1718" data-name="Trailing Icon">
                    <p className="[word-break:break-word] font-['Material_Symbols_Rounded:Regular'] font-normal leading-none relative shrink-0 text-[20px] text-[color:var(--on-surface\/secondary,#666)] text-center whitespace-nowrap" data-node-id="I780:87964;2434:1718;2043:1548" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                      more_vert
                    </p>
                  </div>
                </div>
                <div className="content-stretch flex gap-[var(--spacing-3,12px)] items-center overflow-clip px-[var(--spacing-0,0px)] py-[var(--spacing-3,12px)] relative shrink-0 w-full" data-node-id="780:87965" data-name="Two Line">
                  <div className="relative shrink-0 size-[40px]" data-node-id="I780:87965;1996:12040" data-name="Generic">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGeneric} />
                  </div>
                  <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col font-[family-name:var(--font\/family\/inter,'Roboto:Regular')] font-normal gap-[4px] items-start min-w-px relative" data-node-id="I780:87965;1126:357" data-name="List Items">
                    <p className="leading-[20px] relative shrink-0 text-[color:var(--on-surface\/default,#1a1a1a)] text-[length:var(--font\/size\/m,14px)] w-full" data-node-id="I780:87965;1126:358" style={{ fontVariationSettings: '"wdth" 100' }}>
                      Germaine
                    </p>
                    <p className="leading-[16px] relative shrink-0 text-[color:var(--on-surface\/secondary,#666)] text-[length:var(--font\/size\/s,12px)] w-full" data-node-id="I780:87965;1126:359" style={{ fontVariationSettings: '"wdth" 100' }}>
                      Designer
                    </p>
                  </div>
                  <div className="content-stretch flex items-center justify-center overflow-clip relative rounded-[4px] shrink-0" data-node-id="I780:87965;2434:1718" data-name="Trailing Icon">
                    <p className="[word-break:break-word] font-['Material_Symbols_Rounded:Regular'] font-normal leading-none relative shrink-0 text-[20px] text-[color:var(--on-surface\/secondary,#666)] text-center whitespace-nowrap" data-node-id="I780:87965;2434:1718;2043:1548" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                      more_vert
                    </p>
                  </div>
                </div>
                <div className="content-stretch flex gap-[var(--spacing-3,12px)] items-center overflow-clip px-[var(--spacing-0,0px)] py-[var(--spacing-3,12px)] relative shrink-0 w-full" data-node-id="780:87966" data-name="Two Line">
                  <div className="relative shrink-0 size-[40px]" data-node-id="I780:87966;1996:12040" data-name="Generic">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGeneric} />
                  </div>
                  <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col font-[family-name:var(--font\/family\/inter,'Roboto:Regular')] font-normal gap-[4px] items-start min-w-px relative" data-node-id="I780:87966;1126:357" data-name="List Items">
                    <p className="leading-[20px] relative shrink-0 text-[color:var(--on-surface\/default,#1a1a1a)] text-[length:var(--font\/size\/m,14px)] w-full" data-node-id="I780:87966;1126:358" style={{ fontVariationSettings: '"wdth" 100' }}>
                      Alex
                    </p>
                    <p className="leading-[16px] relative shrink-0 text-[color:var(--on-surface\/secondary,#666)] text-[length:var(--font\/size\/s,12px)] w-full" data-node-id="I780:87966;1126:359" style={{ fontVariationSettings: '"wdth" 100' }}>
                      Designer
                    </p>
                  </div>
                  <div className="content-stretch flex items-center justify-center overflow-clip relative rounded-[4px] shrink-0" data-node-id="I780:87966;2434:1718" data-name="Trailing Icon">
                    <p className="[word-break:break-word] font-['Material_Symbols_Rounded:Regular'] font-normal leading-none relative shrink-0 text-[20px] text-[color:var(--on-surface\/secondary,#666)] text-center whitespace-nowrap" data-node-id="I780:87966;2434:1718;2043:1548" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                      more_vert
                    </p>
                  </div>
                </div>
                <div className="content-stretch flex gap-[var(--spacing-3,12px)] items-center overflow-clip px-[var(--spacing-0,0px)] py-[var(--spacing-3,12px)] relative shrink-0 w-full" data-node-id="780:87967" data-name="Two Line">
                  <div className="relative shrink-0 size-[40px]" data-node-id="I780:87967;1996:12040" data-name="Generic">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGeneric} />
                  </div>
                  <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col font-[family-name:var(--font\/family\/inter,'Roboto:Regular')] font-normal gap-[4px] items-start min-w-px relative" data-node-id="I780:87967;1126:357" data-name="List Items">
                    <p className="leading-[20px] relative shrink-0 text-[color:var(--on-surface\/default,#1a1a1a)] text-[length:var(--font\/size\/m,14px)] w-full" data-node-id="I780:87967;1126:358" style={{ fontVariationSettings: '"wdth" 100' }}>
                      Germaine
                    </p>
                    <p className="leading-[16px] relative shrink-0 text-[color:var(--on-surface\/secondary,#666)] text-[length:var(--font\/size\/s,12px)] w-full" data-node-id="I780:87967;1126:359" style={{ fontVariationSettings: '"wdth" 100' }}>
                      Designer
                    </p>
                  </div>
                  <div className="content-stretch flex items-center justify-center overflow-clip relative rounded-[4px] shrink-0" data-node-id="I780:87967;2434:1718" data-name="Trailing Icon">
                    <p className="[word-break:break-word] font-['Material_Symbols_Rounded:Regular'] font-normal leading-none relative shrink-0 text-[20px] text-[color:var(--on-surface\/secondary,#666)] text-center whitespace-nowrap" data-node-id="I780:87967;2434:1718;2043:1548" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                      more_vert
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bg-[var(--surface\/default,white)] border-[var(--surface\/variant,#e5e5e5)] border-solid border-t bottom-[-1px] content-stretch drop-shadow-[0px_25px_25px_rgba(0,0,0,0.25)] flex gap-[var(--spacing-3,12px)] items-center justify-end left-[-1px] p-[var(--spacing-4,16px)] right-[-1px]" data-node-id="780:87968" data-name="modal-bottom">
          <div className="border border-[var(--on-surface\/border,#ccc)] border-solid content-stretch flex items-center justify-center px-[var(--spacing-4,16px)] py-[var(--spacing-2,8px)] relative rounded-[4px] shrink-0" data-node-id="780:87969" data-name="Buttons">
            <div className="[word-break:break-word] flex flex-col font-[family-name:var(--font\/family\/inter,'Inter:SemiBold')] font-[var(--font\/weight\/semibold,normal)] justify-center leading-[0] relative shrink-0 text-[color:var(--on-surface\/secondary,#666)] text-[length:var(--font\/size\/m,14px)] text-center whitespace-nowrap" data-node-id="I780:87969;1360:458">
              <p className="leading-[20px]">Clear All</p>
            </div>
          </div>
          <div className="bg-[var(--primary\/default,#50f)] content-stretch flex h-[36px] items-center justify-center px-[var(--spacing-4,16px)] py-[var(--spacing-2,8px)] relative rounded-[var(--radius-1,4px)] shrink-0" data-node-id="780:87970" data-name="Buttons">
            <div className="[word-break:break-word] flex flex-col font-[family-name:var(--font\/family\/inter,'Inter:SemiBold')] font-[var(--font\/weight\/semibold,normal)] justify-center leading-[0] relative shrink-0 text-[color:var(--on-primary\/default,white)] text-[length:var(--font\/size\/m,14px)] text-center whitespace-nowrap" data-node-id="I780:87970;1360:782">
              <p className="leading-[20px]">Assign</p>
            </div>
          </div>
        </div>
      </div>
      <Pointinghand className="absolute h-[17px] left-[895px] overflow-clip top-[248px] w-[16px]" />
    </div>
  );
}