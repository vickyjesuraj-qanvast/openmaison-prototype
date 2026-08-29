const imgRectangle1 = "https://www.figma.com/api/mcp/asset/8d7b6cda-1fb8-49e1-969c-98c1a68775c3.png";
const imgGroup20 = "https://www.figma.com/api/mcp/asset/e14a9bda-e7d6-4069-bf3e-e7c7497f95fd.svg";
const imgOpenMaison = "https://www.figma.com/api/mcp/asset/fb061980-1b67-4698-8f20-044377226b84.svg";
const imgMaisonAi = "https://www.figma.com/api/mcp/asset/56d2a6f9-69a6-4949-8656-20cd263ed6c9.svg";

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

export default function Component01() {
  return (
    <div className="bg-[var(--surface\/default,white)] relative size-full" data-node-id="779:19690" data-name="01">
      <div className="absolute bg-[var(--surface\/bg,#f2f2f2)] bottom-0 content-stretch flex flex-col gap-[var(--spacing-2,8px)] items-start left-0 p-[var(--spacing-2,8px)] top-0 w-[1440px]" data-node-id="779:19691" data-name="Page">
        <div className="content-stretch flex flex-[1_0_0] gap-[var(--spacing-2,8px)] items-start min-h-px relative w-full" data-node-id="779:19692" data-name="Main container">
          <div className="bg-[var(--surface\/default,white)] h-full relative rounded-[var(--radius-2,8px)] shrink-0 w-[216px]" data-node-id="780:75727" data-name="Side Nav">
            <div className="absolute bottom-0 content-stretch flex flex-col items-start left-0 overflow-clip p-[var(--spacing-2,8px)] top-0 w-[216px]" data-node-id="I780:75727;6727:649" data-name="side-nav-container">
              <div className="content-stretch flex flex-[1_0_0] flex-col items-start min-h-px relative" data-node-id="I780:75727;6727:650" data-name="side-nav-top">
                <div className="content-stretch flex flex-col items-start pb-[var(--spacing-5,20px)] pt-[var(--spacing-2,8px)] px-[var(--spacing-0,0px)] relative shrink-0 w-full" data-node-id="I780:75727;6727:651" data-name="logo-container">
                  <div className="h-[36px] relative shrink-0 w-full" data-node-id="I780:75727;6727:652">
                    <div className="absolute content-stretch flex items-center justify-center left-0 overflow-clip p-[var(--spacing-1,4px)] rounded-[var(--radius-2,8px)] top-0" data-node-id="I780:75727;6727:653" data-name="Side Nav / Item">
                      <div className="h-[28px] relative shrink-0 w-[143.237px]" data-node-id="I780:75727;6727:654" data-name="Logo">
                        <div className="absolute aspect-[173/172.99998474121094] left-0 right-[80.45%] top-0" data-node-id="I780:75727;6727:654;2530:287">
                          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup20} />
                        </div>
                        <div className="absolute inset-[24.86%_0_11.72%_23.5%]" data-node-id="I780:75727;6727:654;2530:291" data-name="OpenMaison">
                          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgOpenMaison} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="[word-break:break-word] absolute font-['Material_Symbols_Rounded:Light'] font-light leading-none right-[22px] text-[20px] text-[color:var(--on-surface\/disabled,#999)] top-[calc(50%-16px)] translate-x-full whitespace-nowrap" data-node-id="I780:75727;6727:657" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                    left_panel_close
                  </p>
                </div>
                <div className="content-stretch flex flex-[1_0_0] flex-col items-center min-h-px relative" data-node-id="I780:75727;6727:658" data-name="Top Half2">
                  <div className="content-stretch flex flex-col gap-[var(--spacing-0,0px)] items-start pb-[var(--spacing-3,12px)] relative shrink-0 w-full" data-node-id="I780:75727;6727:659">
                    <button className="[word-break:break-word] bg-[var(--surface\/bg,#f2f2f2)] content-stretch cursor-pointer flex gap-[var(--spacing-2,8px)] items-center overflow-clip p-[var(--spacing-2,8px)] relative rounded-[var(--radius-2,8px)] shrink-0 text-[color:var(--on-surface\/secondary,#666)] text-left w-full" data-node-id="I780:75727;6727:660" data-name="Search Bar">
                      <p className="font-['Material_Symbols_Outlined:Regular'] leading-none not-italic relative shrink-0 text-[20px] whitespace-nowrap" data-node-id="I780:75727;6727:660;2183:1410">
                        search
                      </p>
                      <p className="font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium leading-[20px] relative shrink-0 text-[length:var(--font\/size\/m,14px)] w-[156px]" data-node-id="I780:75727;6727:660;1174:163">
                        Search
                      </p>
                    </button>
                    <div className="-translate-y-1/2 absolute bg-[var(--surface\/default,white)] border-[length:var(--border-1,1px)] border-[var(--on-surface\/border,#ccc)] border-solid content-stretch flex flex-col gap-[var(--spacing-0,0px)] items-center justify-center overflow-clip right-[8px] rounded-[var(--radius-1,4px)] top-[calc(50%-6px)]" data-node-id="I780:75727;6727:661">
                      <div className="[word-break:break-word] flex flex-col font-[family-name:var(--font\/family\/inter,'Inter:SemiBold')] font-[var(--font\/weight\/semibold,normal)] justify-center leading-[0] relative shrink-0 text-[color:var(--on-surface\/secondary,#666)] text-[length:var(--font\/size\/m,14px)] text-center w-[20px]" data-node-id="I780:75727;6727:662">
                        <p className="leading-[20px]">/</p>
                      </div>
                    </div>
                  </div>
                  <div className="content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-2,8px)] items-start min-h-px relative w-full" data-node-id="I780:75727;6727:663" data-name="Top3">
                    <div className="content-stretch flex gap-[var(--spacing-2,8px)] h-[36px] items-center justify-center overflow-clip p-[6px] relative shrink-0 w-[200px]" data-node-id="I780:75727;6727:663;780:75721" data-name="Workspace">
                      <p className="[word-break:break-word] font-['Material_Symbols_Rounded:Light'] font-light leading-none relative shrink-0 text-[24px] text-[color:var(--on-surface\/default,#1a1a1a)] whitespace-nowrap" data-node-id="I780:75727;6727:663;780:75721;6721:957" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                        dashboard
                      </p>
                      <div className="content-stretch flex flex-[1_0_0] gap-[8px] items-center min-w-px relative" data-node-id="I780:75727;6727:663;780:75721;6721:958" data-name="Tab details">
                        <p className="[word-break:break-word] flex-[1_0_0] font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium leading-[20px] min-w-px relative text-[color:var(--on-surface\/default,#1a1a1a)] text-[length:var(--font\/size\/m,14px)]" data-node-id="I780:75727;6727:663;780:75721;6721:959">
                          Dashboard
                        </p>
                      </div>
                    </div>
                    <div className="content-stretch flex gap-[var(--spacing-2,8px)] items-center justify-center overflow-clip p-[6px] relative shrink-0 w-[200px]" data-node-id="I780:75727;6727:663;780:75722" data-name="Catalog">
                      <p className="[word-break:break-word] font-['Material_Symbols_Rounded:Light'] font-light leading-none relative shrink-0 text-[24px] text-[color:var(--on-surface\/default,#1a1a1a)] whitespace-nowrap" data-node-id="I780:75727;6727:663;780:75722;6721:957" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                        business_center
                      </p>
                      <div className="content-stretch flex flex-[1_0_0] gap-[8px] items-center min-w-px relative" data-node-id="I780:75727;6727:663;780:75722;6721:958" data-name="Tab details">
                        <p className="[word-break:break-word] flex-[1_0_0] font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium leading-[20px] min-w-px relative text-[color:var(--on-surface\/default,#1a1a1a)] text-[length:var(--font\/size\/m,14px)]" data-node-id="I780:75727;6727:663;780:75722;6721:959">
                          Projects
                        </p>
                      </div>
                    </div>
                    <div className="bg-[var(--primary\/variant,#eee5ff)] content-stretch flex gap-[8px] h-[36px] items-center justify-center overflow-clip p-[6px] relative rounded-[var(--radius-2,8px)] shrink-0 w-[200px]" data-node-id="I780:75727;6727:663;780:75723" data-name="Calendar">
                      <p className="[word-break:break-word] font-['Material_Symbols_Rounded:Light'] font-light leading-none relative shrink-0 text-[24px] text-[color:var(--on-primary\/variant,#40c)] whitespace-nowrap" data-node-id="I780:75727;6727:663;780:75723;6721:997" style={{ fontVariationSettings: '"FILL" 1, "GRAD" 0' }}>
                        people_alt
                      </p>
                      <div className="content-stretch flex flex-[1_0_0] gap-[8px] items-center min-w-px relative" data-node-id="I780:75727;6727:663;780:75723;6721:998" data-name="Tab details">
                        <p className="[word-break:break-word] flex-[1_0_0] font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium leading-[20px] min-w-px relative text-[color:var(--on-primary\/variant,#40c)] text-[length:var(--font\/size\/m,14px)]" data-node-id="I780:75727;6727:663;780:75723;6721:999">
                          Leads
                        </p>
                      </div>
                    </div>
                    <div className="content-stretch flex gap-[var(--spacing-2,8px)] h-[36px] items-center justify-center overflow-clip p-[6px] relative shrink-0 w-[200px]" data-node-id="I780:75727;6727:663;780:75724" data-name="Reports">
                      <p className="[word-break:break-word] font-['Material_Symbols_Rounded:Light'] font-light leading-none relative shrink-0 text-[24px] text-[color:var(--on-surface\/default,#1a1a1a)] whitespace-nowrap" data-node-id="I780:75727;6727:663;780:75724;6721:957" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                        storefront
                      </p>
                      <div className="content-stretch flex flex-[1_0_0] gap-[8px] items-center min-w-px relative" data-node-id="I780:75727;6727:663;780:75724;6721:958" data-name="Tab details">
                        <p className="[word-break:break-word] flex-[1_0_0] font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium leading-[20px] min-w-px relative text-[color:var(--on-surface\/default,#1a1a1a)] text-[length:var(--font\/size\/m,14px)]" data-node-id="I780:75727;6727:663;780:75724;6721:959">
                          Marketplace
                        </p>
                      </div>
                    </div>
                    <div className="content-stretch flex gap-[var(--spacing-2,8px)] h-[36px] items-center justify-center overflow-clip p-[6px] relative shrink-0 w-[200px]" data-node-id="I780:75727;6727:663;780:75725" data-name="Community">
                      <p className="[word-break:break-word] font-['Material_Symbols_Rounded:Light'] font-light leading-none relative shrink-0 text-[24px] text-[color:var(--on-surface\/default,#1a1a1a)] whitespace-nowrap" data-node-id="I780:75727;6727:663;780:75725;6721:957" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                        domain
                      </p>
                      <div className="content-stretch flex flex-[1_0_0] gap-[8px] items-center min-w-px relative" data-node-id="I780:75727;6727:663;780:75725;6721:958" data-name="Tab details">
                        <p className="[word-break:break-word] flex-[1_0_0] font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium leading-[20px] min-w-px relative text-[color:var(--on-surface\/default,#1a1a1a)] text-[length:var(--font\/size\/m,14px)]" data-node-id="I780:75727;6727:663;780:75725;6721:959">
                          Company
                        </p>
                      </div>
                    </div>
                    <div className="content-stretch flex gap-[var(--spacing-2,8px)] h-[36px] items-center justify-center overflow-clip p-[6px] relative shrink-0 w-[200px]" data-node-id="I780:75727;6727:663;780:75726" data-name="Orders">
                      <p className="[word-break:break-word] font-['Material_Symbols_Rounded:Light'] font-light leading-none relative shrink-0 text-[24px] text-[color:var(--on-surface\/default,#1a1a1a)] whitespace-nowrap" data-node-id="I780:75727;6727:663;780:75726;6721:957" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                        account_balance
                      </p>
                      <div className="content-stretch flex flex-[1_0_0] gap-[8px] items-center min-w-px relative" data-node-id="I780:75727;6727:663;780:75726;6721:958" data-name="Tab details">
                        <p className="[word-break:break-word] flex-[1_0_0] font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium leading-[20px] min-w-px relative text-[color:var(--on-surface\/default,#1a1a1a)] text-[length:var(--font\/size\/m,14px)]" data-node-id="I780:75727;6727:663;780:75726;6721:959">
                          Qanvast
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="content-stretch flex flex-col items-start justify-end relative shrink-0 w-full" data-node-id="I780:75727;6727:670" data-name="Bottom Half">
                <div className="content-stretch flex flex-col gap-[var(--spacing-2,8px)] items-center justify-end relative shrink-0" data-node-id="I780:75727;6727:671" data-name="Bottom3">
                  <div className="bg-gradient-to-r content-stretch flex from-[rgba(214,97,66,0.1)] gap-[8px] h-[36px] items-center justify-center overflow-clip p-[6px] relative rounded-[var(--radius-2,8px)] shrink-0 to-[rgba(189,58,95,0.1)] w-[200px]" data-node-id="I780:75727;6759:2760" data-name="Orders">
                    <p className="[word-break:break-word] bg-clip-text bg-gradient-to-b font-['Material_Symbols_Rounded:Light'] font-light from-[#b42c69] leading-none relative shrink-0 text-[24px] text-[transparent] to-[#eb802b] whitespace-nowrap" data-node-id="I780:75727;6759:2760;6721:997" style={{ fontVariationSettings: '"FILL" 1, "GRAD" 0' }}>
                      diamond
                    </p>
                    <div className="content-stretch flex flex-[1_0_0] gap-[8px] items-center min-w-px relative" data-node-id="I780:75727;6759:2760;6721:998" data-name="Tab details">
                      <p className="[word-break:break-word] flex-[1_0_0] font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium leading-[20px] min-w-px relative text-[color:var(--on-surface\/default,#1a1a1a)] text-[length:var(--font\/size\/m,14px)]" data-node-id="I780:75727;6759:2760;6721:999">
                        Upgrade
                      </p>
                    </div>
                  </div>
                  <div className="content-stretch flex gap-[var(--spacing-2,8px)] h-[36px] items-center justify-center overflow-clip p-[6px] relative shrink-0 w-[200px]" data-node-id="I780:75727;6727:672" data-name="Dashboard">
                    <p className="[word-break:break-word] font-['Material_Symbols_Rounded:Light'] font-light leading-none relative shrink-0 text-[24px] text-[color:var(--on-surface\/default,#1a1a1a)] whitespace-nowrap" data-node-id="I780:75727;6727:672;6721:957" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                      apps
                    </p>
                    <div className="content-stretch flex flex-[1_0_0] gap-[8px] items-center min-w-px relative" data-node-id="I780:75727;6727:672;6721:958" data-name="Tab details">
                      <p className="[word-break:break-word] flex-[1_0_0] font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium leading-[20px] min-w-px relative text-[color:var(--on-surface\/default,#1a1a1a)] text-[length:var(--font\/size\/m,14px)]" data-node-id="I780:75727;6727:672;6721:959">
                        Tools
                      </p>
                    </div>
                  </div>
                  <div className="content-stretch flex gap-[var(--spacing-2,8px)] h-[36px] items-center justify-center overflow-clip p-[6px] relative shrink-0 w-[200px]" data-node-id="I780:75727;6727:673" data-name="Community">
                    <p className="[word-break:break-word] font-['Material_Symbols_Rounded:Light'] font-light leading-none relative shrink-0 text-[24px] text-[color:var(--on-surface\/default,#1a1a1a)] whitespace-nowrap" data-node-id="I780:75727;6727:673;6721:957" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                      chat
                    </p>
                    <div className="content-stretch flex flex-[1_0_0] gap-[8px] items-center min-w-px relative" data-node-id="I780:75727;6727:673;6721:958" data-name="Tab details">
                      <p className="[word-break:break-word] flex-[1_0_0] font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium leading-[20px] min-w-px relative text-[color:var(--on-surface\/default,#1a1a1a)] text-[length:var(--font\/size\/m,14px)]" data-node-id="I780:75727;6727:673;6721:959">
                        Chat
                      </p>
                    </div>
                  </div>
                  <div className="content-stretch flex gap-[var(--spacing-2,8px)] h-[36px] items-center justify-center overflow-clip p-[6px] relative shrink-0 w-[200px]" data-node-id="I780:75727;6727:674" data-name="Reports">
                    <p className="[word-break:break-word] font-['Material_Symbols_Rounded:Light'] font-light leading-none relative shrink-0 text-[24px] text-[color:var(--on-surface\/default,#1a1a1a)] whitespace-nowrap" data-node-id="I780:75727;6727:674;6721:957" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                      notifications
                    </p>
                    <div className="content-stretch flex flex-[1_0_0] gap-[8px] items-center min-w-px relative" data-node-id="I780:75727;6727:674;6721:958" data-name="Tab details">
                      <p className="[word-break:break-word] flex-[1_0_0] font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium leading-[20px] min-w-px relative text-[color:var(--on-surface\/default,#1a1a1a)] text-[length:var(--font\/size\/m,14px)]" data-node-id="I780:75727;6727:674;6721:959">
                        Notifications
                      </p>
                    </div>
                  </div>
                  <div className="content-stretch flex gap-[var(--spacing-2,8px)] h-[36px] items-center justify-center overflow-clip p-[6px] relative shrink-0 w-[200px]" data-node-id="I780:75727;6727:675" data-name="Orders">
                    <p className="[word-break:break-word] font-['Material_Symbols_Rounded:Light'] font-light leading-none relative shrink-0 text-[24px] text-[color:var(--on-surface\/default,#1a1a1a)] whitespace-nowrap" data-node-id="I780:75727;6727:675;6721:957" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                      settings
                    </p>
                    <div className="content-stretch flex flex-[1_0_0] gap-[8px] items-center min-w-px relative" data-node-id="I780:75727;6727:675;6721:958" data-name="Tab details">
                      <p className="[word-break:break-word] flex-[1_0_0] font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium leading-[20px] min-w-px relative text-[color:var(--on-surface\/default,#1a1a1a)] text-[length:var(--font\/size\/m,14px)]" data-node-id="I780:75727;6727:675;6721:959">
                        Settings
                      </p>
                    </div>
                  </div>
                </div>
                <div className="content-stretch flex items-center pb-[var(--spacing-2,8px)] pr-[var(--spacing-0,0px)] pt-[var(--spacing-5,20px)] relative shrink-0 w-full" data-node-id="I780:75727;6727:676" data-name="logo-container">
                  <div className="content-stretch flex flex-[1_0_0] gap-[var(--spacing-2,8px)] items-center min-w-px relative" data-node-id="I780:75727;6727:677">
                    <div className="border border-[var(--surface\/variant,#e5e5e5)] border-solid relative rounded-[var(--radius-2,8px)] shrink-0 size-[36px]" data-node-id="I780:75727;6727:678">
                      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none rounded-[var(--radius-2,8px)] size-full" src={imgRectangle1} />
                    </div>
                    <div className="flex flex-[1_0_0] flex-row items-center self-stretch" data-node-id="I780:75727;6727:679">
                      <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium gap-[var(--spacing-0,0px)] h-full items-center justify-center min-w-px relative">
                        <p className="leading-[20px] relative shrink-0 text-[color:var(--on-surface\/default,#1a1a1a)] text-[length:var(--font\/size\/m,14px)] w-full" data-node-id="I780:75727;6727:680">
                          Studio Name
                        </p>
                        <p className="leading-[16px] relative shrink-0 text-[color:var(--on-surface\/secondary,#666)] text-[length:var(--font\/size\/s,12px)] w-full" data-node-id="I780:75727;6727:681">
                          Owner Name
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-[var(--surface\/default,white)] content-stretch flex flex-[1_0_0] flex-col h-full items-start min-w-px overflow-clip relative rounded-[var(--radius-2,8px)]" data-node-id="779:19694" data-name="body-container">
            <PageHeaderLeadsL1 className="bg-[var(--surface\/default,white)] border-[var(--surface\/variant,#e5e5e5)] border-b-[length:var(--border-1,1px)] border-solid content-stretch flex gap-[var(--spacing-3,12px)] items-center overflow-clip px-[var(--spacing-6,24px)] py-[var(--spacing-4,16px)] relative shrink-0 w-full" />
            <div className="content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-6,24px)] items-start min-h-px p-[var(--spacing-6,24px)] relative w-full" data-node-id="779:19696" data-name="Container">
              <div className="content-stretch flex gap-[var(--spacing-4,16px)] items-center py-[var(--spacing-0,0px)] relative rounded-[var(--radius-2,8px)] shrink-0 w-full" data-node-id="779:19697" data-name="Section items">
                <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-node-id="779:19698">
                  <div className="[word-break:break-word] border border-[var(--on-surface\/border,#ccc)] border-solid content-stretch flex gap-[8px] h-[36px] items-center justify-center pl-[var(--spacing-4,16px)] pr-[var(--spacing-3,12px)] py-[var(--spacing-2,8px)] relative rounded-[4px] shrink-0 text-center whitespace-nowrap" data-node-id="779:19699" data-name="Buttons">
                    <div className="flex flex-col font-[family-name:var(--font\/family\/inter,'Inter:SemiBold')] font-[var(--font\/weight\/semibold,normal)] justify-center leading-[0] relative shrink-0 text-[color:var(--on-surface\/default,#1a1a1a)] text-[length:var(--font\/size\/m,14px)]" data-node-id="779:19700">
                      <p className="leading-[20px]">All Leads (99)</p>
                    </div>
                    <p className="font-['Material_Symbols_Rounded:Regular'] font-normal leading-none relative shrink-0 text-[20px] text-[color:var(--on-surface\/secondary,#666)]" data-node-id="779:19702" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                      keyboard_arrow_down
                    </p>
                  </div>
                </div>
                <div className="content-stretch flex gap-[var(--spacing-3,12px)] items-center justify-end relative shrink-0" data-node-id="779:19703">
                  <button className="[word-break:break-word] bg-[var(--surface\/default,white)] border border-[var(--on-surface\/border,#ccc)] border-solid content-stretch cursor-pointer flex gap-[var(--spacing-2,8px)] items-center overflow-clip p-[var(--spacing-2,8px)] relative rounded-[var(--radius-1,4px)] shrink-0 text-[color:var(--on-surface\/secondary,#666)] text-left w-[280px]" data-node-id="779:19704" data-name="Search Bar">
                    <p className="font-['Material_Symbols_Outlined:Regular'] leading-none not-italic relative shrink-0 text-[20px] whitespace-nowrap" data-node-id="I779:19704;1174:166">
                      search
                    </p>
                    <p className="flex-[1_0_0] font-[family-name:var(--font\/family\/inter,'Inter:SemiBold')] font-[var(--font\/weight\/semibold,normal)] leading-[20px] min-w-px relative text-[length:var(--font\/size\/m,14px)]" data-node-id="I779:19704;1174:167">
                      Search
                    </p>
                  </button>
                  <div className="border border-[var(--on-surface\/border,#ccc)] border-solid content-stretch flex items-center justify-center p-[var(--spacing-2,8px)] relative rounded-[4px] shrink-0 size-[36px]" data-node-id="779:19705" data-name="Icon Buttons">
                    <div className="[word-break:break-word] flex flex-col font-['Material_Symbols_Rounded:Regular'] font-normal justify-center leading-[0] relative shrink-0 text-[20px] text-[color:var(--on-surface\/secondary,#666)] text-center whitespace-nowrap" data-node-id="I779:19705;1208:271" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                      <p className="leading-none">filter_list</p>
                    </div>
                  </div>
                  <div className="content-stretch flex items-center relative shrink-0" data-node-id="779:19706" data-name="Segmented Icon Button">
                    <div className="bg-[var(--primary\/variant,#eee5ff)] border border-[var(--on-surface\/border,#ccc)] border-solid content-stretch flex items-center justify-center mr-[-1px] p-[var(--spacing-2,8px)] relative rounded-bl-[4px] rounded-tl-[4px] shrink-0 size-[36px]" data-node-id="I779:19706;3645:2823" data-name="Start">
                      <div className="[word-break:break-word] flex flex-col font-['Material_Symbols_Rounded:Regular'] font-normal justify-center leading-[0] relative shrink-0 text-[20px] text-[color:var(--on-primary\/variant,#40c)] text-center whitespace-nowrap" data-node-id="I779:19706;3645:2823;3645:2757" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                        <p className="leading-none">view_list</p>
                      </div>
                    </div>
                    <div className="border border-[var(--on-surface\/border,#ccc)] border-solid content-stretch flex items-center justify-center p-[var(--spacing-2,8px)] relative rounded-br-[4px] rounded-tr-[4px] shrink-0 size-[36px]" data-node-id="I779:19706;3645:2827" data-name="End">
                      <div className="[word-break:break-word] flex flex-col font-['Material_Symbols_Rounded:Regular'] font-normal justify-center leading-[0] relative shrink-0 text-[20px] text-[color:var(--on-surface\/secondary,#666)] text-center whitespace-nowrap" data-node-id="I779:19706;3645:2827;3645:2813" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                        <p className="leading-none">view_kanban</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-[var(--surface\/default,white)] border-[length:var(--border-1,1px)] border-[var(--surface\/variant,#e5e5e5)] border-solid content-stretch flex flex-col items-start overflow-clip relative rounded-[var(--radius-2,8px)] shrink-0" data-node-id="779:19707" data-name="Table">
                <TableRowLeadDefault className="content-stretch flex h-[56px] items-center relative shrink-0" />
                <div className="content-stretch flex h-[64px] items-center relative shrink-0" data-node-id="779:19709" data-name="Table / Row / Lead - Default">
                  <div className="border-[var(--surface\/variant,#e5e5e5)] border-r-[length:var(--border-2,2px)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[240px]" data-node-id="I779:19709;408:49292" data-name="Table / Cell / Two line / Text">
                    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-1,4px)] items-start min-w-px relative" data-node-id="I779:19709;408:49293" data-name="Cell Data">
                      <div className="content-stretch flex gap-[var(--spacing-1,4px)] items-center relative shrink-0" data-node-id="I779:19709;452:24851">
                        <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Bold')] font-[var(--font\/weight\/bold,normal)] font-bold leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="I779:19709;408:49296">
                          Sample Lead
                        </p>
                      </div>
                      <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[16px] min-w-full overflow-hidden relative shrink-0 text-[12px] text-[color:var(--on-surface\/secondary,#666)] text-ellipsis w-[min-content] whitespace-nowrap" data-node-id="I779:19709;408:49297">
                        9123 4567
                      </p>
                    </div>
                  </div>
                  <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[146px]" data-node-id="I779:19709;408:49706" data-name="Table / Cell / One line / Text + Trailing Icon">
                    <div className="[word-break:break-word] content-stretch flex font-normal gap-[var(--spacing-1,4px)] items-start relative shrink-0 text-[color:var(--on-surface\/default,#1a1a1a)] whitespace-nowrap" data-node-id="I779:19709;408:49707" data-name="CellDataGroup">
                      <p className="font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-ellipsis" data-node-id="I779:19709;408:49708">
                        New
                      </p>
                      <p className="font-['Material_Symbols_Rounded:Regular'] leading-none relative shrink-0 text-[20px]" data-node-id="I779:19709;408:49709" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                        keyboard_arrow_down
                      </p>
                    </div>
                  </div>
                  <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[321px]" data-node-id="I779:19709;408:53280" data-name="Table / Cell / One line / Text + Tag Vertical">
                    <div className="border border-[var(--surface\/variant,#e5e5e5)] border-solid content-stretch flex gap-[var(--spacing-2,8px)] items-center overflow-clip p-[var(--spacing-2,8px)] relative rounded-[var(--radius-1,4px)] shrink-0 w-[281px]" data-node-id="I779:19709;408:53281">
                      <p className="[word-break:break-word] flex-[1_0_0] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[20px] min-w-px overflow-hidden relative text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="I779:19709;408:53282">
                        This is a sample task added by the user
                      </p>
                    </div>
                  </div>
                  <TableCellMember className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-[64px] items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[160px]" />
                  <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[132px]" data-node-id="I779:19709;408:52077" data-name="Table / Cell / One line / Source">
                    <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="I779:19709;408:52080">
                      Instagram
                    </p>
                  </div>
                  <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[138px]" data-node-id="I779:19709;408:52275" data-name="Table / Cell / One line / Text">
                    <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="I779:19709;408:52277">
                      70,500
                    </p>
                  </div>
                  <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[158px]" data-node-id="I779:19709;408:52419" data-name="Table / Cell / One line / Text">
                    <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="I779:19709;408:52421">
                      HDB 4-Room
                    </p>
                  </div>
                  <div className="border-[var(--surface\/variant,#e5e5e5)] border-solid border-t content-stretch flex gap-[var(--spacing-3,12px)] h-full items-center overflow-clip pl-[var(--spacing-4,16px)] pr-[var(--spacing-6,24px)] py-[var(--spacing-3,12px)] relative shrink-0 w-[115px]" data-node-id="I779:19709;408:52563" data-name="Table / Cell / One line / Text">
                    <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="I779:19709;408:52565">
                      17 Jul ‘26
                    </p>
                  </div>
                  <div className="absolute bg-[var(--primary\/default,#50f)] h-[64px] left-0 top-0 w-[4px]" data-node-id="I779:19709;452:25052" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-[24px] right-[24px] size-[48px]" data-node-id="779:19710" data-name="Maison AI">
        <div className="absolute inset-[-16.67%_-41.67%_-83.33%_-41.67%]">
          <img alt="" className="block max-w-none size-full" src={imgMaisonAi} />
        </div>
      </div>
    </div>
  );
}