const imgPage1 = "https://www.figma.com/api/mcp/asset/297ddd2d-9ecb-4f1b-a3e8-79367c79d8c0.svg";

type HorizontalProps = {
  className?: string;
  states?: "10%";
  type?: "Solid";
};

function Horizontal({ className, states = "10%", type = "Solid" }: HorizontalProps) {
  return <div className={className || "bg-[var(--surface\\/variant,#e5e5e5)] h-px overflow-clip relative w-[360px]"} data-node-id="72:2853" />;
}

export default function DefaultView() {
  return (
    <div className="bg-[var(--surface\/default,white)] relative size-full" data-node-id="780:91935" data-name="Default view">
      <div className="absolute bg-[var(--overlay\/60p,rgba(0,0,0,0.6))] h-[1416px] left-0 top-0 w-[1440px]" data-node-id="780:91936" data-name="Overlay" />
      <div className="-translate-x-1/2 absolute bg-[var(--surface\/default,white)] content-stretch flex flex-col h-[1320px] items-start left-1/2 overflow-clip rounded-[var(--radius-3,12px)] top-[48px] w-[800px]" data-node-id="780:92744" data-name="ModalComponent">
        <div className="bg-[var(--surface\/default,white)] border-[var(--surface\/variant,#e5e5e5)] border-b border-solid content-stretch flex gap-[var(--spacing-4,16px)] items-start px-[var(--spacing-6,24px)] py-[var(--spacing-5,20px)] relative shrink-0 w-full" data-node-id="780:92745" data-name="Heading">
          <div className="content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-1,4px)] items-start min-w-px relative" data-node-id="780:92746">
            <div className="content-stretch flex gap-[var(--spacing-3,12px)] items-center relative shrink-0 w-full" data-node-id="780:92747">
              <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Bold')] font-[var(--font\/weight\/bold,normal)] font-bold leading-[24px] relative shrink-0 text-[color:var(--on-surface\/default,#1a1a1a)] text-[length:var(--font\/size\/xl,20px)] whitespace-nowrap" data-node-id="780:92748">
                Move stage
              </p>
            </div>
            <div className="[word-break:break-word] content-center flex flex-wrap font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal gap-[var(--spacing-1,4px)] items-center leading-[16px] relative shrink-0 text-[12px] text-[color:var(--on-surface\/secondary,#666)] w-full whitespace-nowrap" data-node-id="780:92749">
              <p className="overflow-hidden relative shrink-0 text-ellipsis" data-node-id="780:92750">
                Olivia Martinez
              </p>
              <p className="overflow-hidden relative shrink-0 text-ellipsis w-[4px]" data-node-id="780:92751">
                ·
              </p>
              <p className="overflow-hidden relative shrink-0 text-ellipsis" data-node-id="780:92752">
                Current stage: Contacted
              </p>
            </div>
          </div>
          <div className="content-stretch flex items-center justify-center overflow-clip relative rounded-[4.8px] shrink-0" data-node-id="780:92753" data-name="Link Icon">
            <p className="[word-break:break-word] font-['Material_Symbols_Outlined:Regular'] leading-none not-italic relative shrink-0 text-[24px] text-[color:var(--on-surface\/secondary,#666)] text-center whitespace-nowrap" data-node-id="I780:92753;2043:1548">
              close
            </p>
          </div>
        </div>
        <div className="content-stretch flex flex-[1_0_0] items-start min-h-px relative w-full" data-node-id="780:92754" data-name="modal-body">
          <div className="[word-break:break-word] bg-[var(--surface\/bg,#f2f2f2)] content-stretch flex flex-col h-full items-start relative shrink-0 w-[240px]" data-node-id="780:92755" data-name="Filter Options">
            <div className="content-stretch flex gap-[var(--spacing-2,8px)] items-center justify-center pl-[var(--spacing-6,24px)] pr-[var(--spacing-4,16px)] py-[var(--spacing-4,16px)] relative shrink-0 w-full" data-node-id="780:92756" data-name="Filter Option">
              <p className="font-['Material_Symbols_Rounded:Light'] font-light leading-none relative shrink-0 text-[20px] text-[color:var(--tertiary-green\/default,#469e59)] text-center whitespace-nowrap" data-node-id="780:92757" style={{ fontVariationSettings: '"FILL" 1, "GRAD" 0' }}>
                check_circle
              </p>
              <p className="flex-[1_0_0] font-[family-name:var(--font\/family\/inter,'Inter:SemiBold')] font-[var(--font\/weight\/semibold,normal)] leading-[20px] min-w-px relative text-[color:var(--on-surface\/default,#1a1a1a)] text-[length:var(--font\/size\/m,14px)]" data-node-id="780:92763">
                New
              </p>
            </div>
            <div className="content-stretch flex gap-[var(--spacing-2,8px)] items-center justify-center pl-[var(--spacing-6,24px)] pr-[var(--spacing-4,16px)] py-[var(--spacing-4,16px)] relative shrink-0 w-full" data-node-id="780:92764" data-name="Filter Option">
              <p className="font-['Material_Symbols_Rounded:Light'] font-light leading-none relative shrink-0 text-[20px] text-[color:var(--tertiary-green\/default,#469e59)] text-center whitespace-nowrap" data-node-id="780:92765" style={{ fontVariationSettings: '"FILL" 1, "GRAD" 0' }}>
                check_circle
              </p>
              <p className="flex-[1_0_0] font-[family-name:var(--font\/family\/inter,'Inter:SemiBold')] font-[var(--font\/weight\/semibold,normal)] leading-[20px] min-w-px relative text-[color:var(--on-surface\/default,#1a1a1a)] text-[length:var(--font\/size\/m,14px)]" data-node-id="780:92771">
                Contacted
              </p>
            </div>
            <div className="content-stretch flex gap-[var(--spacing-2,8px)] items-center justify-center pl-[var(--spacing-6,24px)] pr-[var(--spacing-4,16px)] py-[var(--spacing-4,16px)] relative shrink-0 w-full" data-node-id="780:92772" data-name="Filter Option">
              <p className="font-['Material_Symbols_Rounded:Light'] font-light leading-none relative shrink-0 text-[20px] text-[color:var(--tertiary-green\/default,#469e59)] text-center whitespace-nowrap" data-node-id="780:92773" style={{ fontVariationSettings: '"FILL" 1, "GRAD" 0' }}>
                check_circle
              </p>
              <p className="flex-[1_0_0] font-[family-name:var(--font\/family\/inter,'Inter:SemiBold')] font-[var(--font\/weight\/semibold,normal)] leading-[20px] min-w-px relative text-[color:var(--on-surface\/default,#1a1a1a)] text-[length:var(--font\/size\/m,14px)]" data-node-id="780:92779">
                Met
              </p>
            </div>
            <div className="content-stretch flex gap-[var(--spacing-2,8px)] items-center justify-center pl-[var(--spacing-6,24px)] pr-[var(--spacing-4,16px)] py-[var(--spacing-4,16px)] relative shrink-0 w-full" data-node-id="780:92780" data-name="Filter Option">
              <p className="font-['Material_Symbols_Rounded:Light'] font-light leading-none relative shrink-0 text-[20px] text-[color:var(--tertiary-green\/default,#469e59)] text-center whitespace-nowrap" data-node-id="780:92781" style={{ fontVariationSettings: '"FILL" 1, "GRAD" 0' }}>
                check_circle
              </p>
              <p className="flex-[1_0_0] font-[family-name:var(--font\/family\/inter,'Inter:SemiBold')] font-[var(--font\/weight\/semibold,normal)] leading-[20px] min-w-px relative text-[color:var(--on-surface\/default,#1a1a1a)] text-[length:var(--font\/size\/m,14px)]" data-node-id="780:92787">
                Quote Sent
              </p>
            </div>
            <div className="bg-[var(--surface\/default,white)] content-stretch flex gap-[var(--spacing-2,8px)] items-center justify-center pl-[var(--spacing-6,24px)] pr-[var(--spacing-4,16px)] py-[var(--spacing-4,16px)] relative shrink-0 w-full" data-node-id="780:92788" data-name="Filter Option">
              <p className="font-['Material_Symbols_Rounded:Regular'] font-normal leading-none relative shrink-0 text-[20px] text-[color:var(--on-surface\/disabled,#999)] text-center whitespace-nowrap" data-node-id="780:92789" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                circle
              </p>
              <p className="flex-[1_0_0] font-[family-name:var(--font\/family\/inter,'Inter:SemiBold')] font-[var(--font\/weight\/semibold,normal)] leading-[20px] min-w-px relative text-[color:var(--on-surface\/default,#1a1a1a)] text-[length:var(--font\/size\/m,14px)]" data-node-id="780:92795">
                Won
              </p>
            </div>
          </div>
          <div className="bg-[var(--surface\/default,white)] content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-6,24px)] h-full items-start min-w-px p-[var(--spacing-6,24px)] relative" data-node-id="780:92797" data-name="Filter content">
            <div className="content-stretch flex flex-col gap-[var(--spacing-6,24px)] items-start relative shrink-0 w-full" data-node-id="780:92798" data-name="Member list">
              <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Bold')] font-[var(--font\/weight\/bold,normal)] font-bold leading-[24px] relative shrink-0 text-[color:var(--on-surface\/default,#1a1a1a)] text-[length:var(--font\/size\/l,16px)] w-full" data-node-id="780:92799">
                Moving to Won
              </p>
              <div className="content-stretch flex flex-col gap-[var(--spacing-3,12px)] items-start relative shrink-0 w-full" data-node-id="780:92800">
                <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-node-id="780:92801">
                  <p className="[word-break:break-word] flex-[1_0_0] font-[family-name:var(--font\/family\/inter,'Inter:SemiBold')] font-[var(--font\/weight\/semibold,normal)] h-[20px] leading-[20px] min-w-px opacity-90 relative text-[color:var(--on-surface\/default,#1a1a1a)] text-[length:var(--font\/size\/m,14px)]" data-node-id="780:92802">
                    Attach client signed quote
                  </p>
                </div>
                <div className="border border-[var(--surface\/variant,#e5e5e5)] border-solid content-stretch flex flex-col gap-[var(--spacing-0,0px)] items-start overflow-clip p-[var(--spacing-0,0px)] relative rounded-[var(--radius-1,4px)] shrink-0 w-[512px]" data-node-id="780:92803">
                  <div className="bg-[var(--surface\/bg,#f2f2f2)] content-stretch flex gap-[var(--spacing-6,24px)] items-center overflow-clip px-[var(--spacing-4,16px)] relative shrink-0 w-full" data-node-id="780:92804">
                    <div className="content-stretch flex gap-[var(--spacing-1,4px)] items-center justify-center min-w-[48px] px-[var(--spacing-0,0px)] py-[var(--spacing-3,12px)] relative shrink-0" data-node-id="780:92805" data-name="Tab Item">
                      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-[family-name:var(--font\/family\/inter,'Inter:SemiBold')] font-[var(--font\/weight\/semibold,normal)] justify-center leading-[0] min-w-px relative text-[color:var(--on-surface\/secondary,#666)] text-[length:var(--font\/size\/m,14px)] text-center" data-node-id="I780:92805;2547:1810">
                        <p className="leading-[20px]">From System</p>
                      </div>
                    </div>
                    <div className="content-stretch flex flex-col gap-[var(--spacing-2,8px)] items-center min-w-[48px] pt-[var(--spacing-3,12px)] px-[var(--spacing-0,0px)] relative shrink-0" data-node-id="780:92806" data-name="Tab Item">
                      <div className="content-stretch flex gap-[4px] items-center relative shrink-0" data-node-id="I780:92806;2547:1804" data-name="Text">
                        <div className="[word-break:break-word] flex flex-col font-[family-name:var(--font\/family\/inter,'Inter:SemiBold')] font-[var(--font\/weight\/semibold,normal)] justify-center leading-[0] relative shrink-0 text-[color:var(--primary\/default,#50f)] text-[length:var(--font\/size\/m,14px)] text-center whitespace-nowrap" data-node-id="I780:92806;2547:1806">
                          <p className="leading-[20px]">Upload</p>
                        </div>
                      </div>
                      <div className="bg-[var(--primary\/default,#50f)] h-[4px] relative rounded-tl-[2px] rounded-tr-[2px] shrink-0 w-full" data-node-id="I780:92806;2547:1807" data-name="Active Tab Indicator" />
                    </div>
                  </div>
                  <div className="content-stretch flex flex-col gap-[var(--spacing-3,12px)] items-start justify-center overflow-clip p-[var(--spacing-4,16px)] relative shrink-0 w-full" data-node-id="780:92807">
                    <div className="bg-[var(--surface\/bg,#f2f2f2)] border-[length:var(--border-2,2px)] border-[var(--on-surface\/border,#ccc)] border-dashed content-stretch flex flex-col gap-[var(--spacing-0,0px)] h-[112px] items-center justify-center px-[var(--spacing-0,0px)] py-[var(--spacing-10,40px)] relative rounded-[var(--radius-1,4px)] shrink-0 w-full" data-node-id="780:92808">
                      <div className="[word-break:break-word] content-stretch flex flex-col gap-[var(--spacing-1,4px)] items-center justify-center leading-[0] relative shrink-0 text-center" data-node-id="780:92809">
                        <div className="flex flex-col font-[family-name:var(--font\/family\/inter,'Inter:SemiBold')] font-[var(--font\/weight\/semibold,normal)] justify-center relative shrink-0 text-[0px] text-[color:var(--on-surface\/default,#1a1a1a)] whitespace-nowrap" data-node-id="780:92810">
                          <p className="text-[14px]">
                            <span className="leading-[20px]">{`Drop your file or `}</span>
                            <span className="[text-underline-position:from-font] [word-break:break-word] decoration-from-font decoration-solid font-['Inter:Semi_Bold'] font-semibold leading-[20px] not-italic underline">browse</span>
                          </p>
                        </div>
                        <div className="flex flex-col font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal justify-center min-w-full relative shrink-0 text-[color:var(--on-surface\/secondary,#666)] text-[length:var(--font\/size\/s,12px)] w-[min-content]" data-node-id="780:92811">
                          <p className="leading-[16px]">Supports: PDF</p>
                        </div>
                      </div>
                    </div>
                    <div className="border-[length:var(--border-2,2px)] border-[var(--primary\/default,#50f)] border-solid content-stretch flex gap-[var(--spacing-3,12px)] items-center overflow-clip p-[var(--spacing-3,12px)] relative rounded-[var(--radius-1,4px)] shrink-0 w-full" data-node-id="780:92812">
                      <p className="[word-break:break-word] font-['Material_Symbols_Rounded:Light'] font-light leading-none relative shrink-0 text-[20px] text-[color:var(--primary\/default,#50f)] text-center whitespace-nowrap" data-node-id="780:92813" style={{ fontVariationSettings: '"FILL" 1, "GRAD" 0' }}>
                        radio_button_checked
                      </p>
                      <div className="content-stretch flex flex-[1_0_0] gap-[var(--spacing-3,12px)] items-center min-w-px relative" data-node-id="780:92814">
                        <div className="overflow-clip relative shrink-0 size-[24px]" data-node-id="780:92815" data-name="File Format">
                          <div className="absolute contents inset-0" data-node-id="I780:92815;1463:502" data-name="Page-1">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgPage1} />
                          </div>
                        </div>
                        <div className="content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-0-5,2px)] items-start min-w-px relative" data-node-id="780:92816">
                          <div className="content-center flex flex-wrap gap-[var(--spacing-1,4px)] gap-y-[4px] items-center relative shrink-0 w-full" data-node-id="780:92817">
                            <p className="[word-break:break-word] flex-[1_0_0] font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium leading-[20px] min-w-px overflow-hidden relative text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="780:92818">
                              Whole-home renovation
                            </p>
                          </div>
                        </div>
                      </div>
                      <p className="[word-break:break-word] font-['Material_Symbols_Rounded:Light'] font-light leading-none relative shrink-0 text-[20px] text-[color:var(--on-surface\/secondary,#666)] text-center whitespace-nowrap" data-node-id="780:92825" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                        delete
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="content-stretch flex flex-col gap-[var(--spacing-1,4px)] items-start relative rounded-[var(--radius-1,4px)] shrink-0 w-full" data-node-id="780:92826" data-name="Text Field">
                <div className="border border-[var(--on-surface\/border,#ccc)] border-solid content-stretch flex gap-[8px] h-[48px] items-center px-[16px] py-[14px] relative rounded-[4px] shrink-0 w-full" data-node-id="I780:92826;1791:1142" data-name="Text Box">
                  <p className="[word-break:break-word] flex-[1_0_0] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal h-[20px] leading-[20px] min-w-px overflow-hidden relative text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="I780:92826;1791:1146">
                    70,500
                  </p>
                  <div className="absolute bg-[var(--surface\/default,white)] content-stretch flex h-px items-center left-[11px] px-[4px] top-[-1px]" data-node-id="I780:92826;1791:1144" data-name="Label">
                    <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[16px] relative shrink-0 text-[color:var(--on-surface\/secondary,#666)] text-[length:var(--font\/size\/s,12px)] whitespace-nowrap" data-node-id="I780:92826;1791:1145">
                      Quote amount (S$)
                    </p>
                  </div>
                </div>
              </div>
              <Horizontal className="bg-[var(--surface\/variant,#e5e5e5)] h-px relative shrink-0 w-full" />
              <div className="content-stretch flex flex-col gap-[var(--spacing-3,12px)] items-start relative shrink-0 w-full" data-node-id="780:92828">
                <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-node-id="780:92829">
                  <p className="[word-break:break-word] flex-[1_0_0] font-[family-name:var(--font\/family\/inter,'Inter:SemiBold')] font-[var(--font\/weight\/semibold,normal)] h-[20px] leading-[20px] min-w-px opacity-90 relative text-[color:var(--on-surface\/default,#1a1a1a)] text-[length:var(--font\/size\/m,14px)]" data-node-id="780:92830">{`Attach client signed contract `}</p>
                </div>
                <div className="border border-[var(--surface\/variant,#e5e5e5)] border-solid content-stretch flex flex-col gap-[var(--spacing-0,0px)] items-start overflow-clip p-[var(--spacing-0,0px)] relative rounded-[var(--radius-1,4px)] shrink-0 w-[512px]" data-node-id="780:92831">
                  <div className="bg-[var(--surface\/bg,#f2f2f2)] content-stretch flex gap-[var(--spacing-6,24px)] items-center overflow-clip px-[var(--spacing-4,16px)] relative shrink-0 w-full" data-node-id="780:92832">
                    <div className="content-stretch flex gap-[var(--spacing-1,4px)] items-center justify-center min-w-[48px] px-[var(--spacing-0,0px)] py-[var(--spacing-3,12px)] relative shrink-0" data-node-id="780:92833" data-name="Tab Item">
                      <div className="[word-break:break-word] flex flex-[1_0_0] flex-col font-[family-name:var(--font\/family\/inter,'Inter:SemiBold')] font-[var(--font\/weight\/semibold,normal)] justify-center leading-[0] min-w-px relative text-[color:var(--on-surface\/secondary,#666)] text-[length:var(--font\/size\/m,14px)] text-center" data-node-id="I780:92833;2547:1810">
                        <p className="leading-[20px]">From System</p>
                      </div>
                    </div>
                    <div className="content-stretch flex flex-col gap-[var(--spacing-2,8px)] items-center min-w-[48px] pt-[var(--spacing-3,12px)] px-[var(--spacing-0,0px)] relative shrink-0" data-node-id="780:92834" data-name="Tab Item">
                      <div className="content-stretch flex gap-[4px] items-center relative shrink-0" data-node-id="I780:92834;2547:1804" data-name="Text">
                        <div className="[word-break:break-word] flex flex-col font-[family-name:var(--font\/family\/inter,'Inter:SemiBold')] font-[var(--font\/weight\/semibold,normal)] justify-center leading-[0] relative shrink-0 text-[color:var(--primary\/default,#50f)] text-[length:var(--font\/size\/m,14px)] text-center whitespace-nowrap" data-node-id="I780:92834;2547:1806">
                          <p className="leading-[20px]">Upload</p>
                        </div>
                      </div>
                      <div className="bg-[var(--primary\/default,#50f)] h-[4px] relative rounded-tl-[2px] rounded-tr-[2px] shrink-0 w-full" data-node-id="I780:92834;2547:1807" data-name="Active Tab Indicator" />
                    </div>
                  </div>
                  <div className="content-stretch flex flex-col gap-[var(--spacing-3,12px)] items-start justify-center overflow-clip p-[var(--spacing-4,16px)] relative shrink-0 w-full" data-node-id="780:92835">
                    <div className="border-[length:var(--border-2,2px)] border-[var(--primary\/default,#50f)] border-solid content-stretch flex gap-[var(--spacing-3,12px)] items-center overflow-clip p-[var(--spacing-3,12px)] relative rounded-[var(--radius-1,4px)] shrink-0 w-full" data-node-id="780:92837">
                      <p className="[word-break:break-word] font-['Material_Symbols_Rounded:Light'] font-light leading-none relative shrink-0 text-[20px] text-[color:var(--primary\/default,#50f)] text-center whitespace-nowrap" data-node-id="780:92838" style={{ fontVariationSettings: '"FILL" 1, "GRAD" 0' }}>
                        radio_button_checked
                      </p>
                      <div className="content-stretch flex flex-[1_0_0] gap-[var(--spacing-3,12px)] items-center min-w-px relative" data-node-id="780:92839">
                        <div className="overflow-clip relative shrink-0 size-[24px]" data-node-id="780:92840" data-name="File Format">
                          <div className="absolute contents inset-0" data-node-id="I780:92840;1463:502" data-name="Page-1">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgPage1} />
                          </div>
                        </div>
                        <div className="content-stretch flex flex-[1_0_0] flex-col gap-[var(--spacing-0-5,2px)] items-start min-w-px relative" data-node-id="780:92841">
                          <div className="content-center flex flex-wrap gap-[var(--spacing-1,4px)] gap-y-[4px] items-center relative shrink-0 w-full" data-node-id="780:92842">
                            <p className="[word-break:break-word] flex-[1_0_0] font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium leading-[20px] min-w-px overflow-hidden relative text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="780:92843">
                              Contract_OliviaM_signed.pdf
                            </p>
                          </div>
                        </div>
                      </div>
                      <p className="[word-break:break-word] font-['Material_Symbols_Rounded:Light'] font-light leading-none relative shrink-0 text-[20px] text-[color:var(--on-surface\/secondary,#666)] text-center whitespace-nowrap" data-node-id="780:92846" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                        delete
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <Horizontal className="bg-[var(--surface\/variant,#e5e5e5)] h-px relative shrink-0 w-full" />
              <div className="content-stretch flex flex-col gap-[var(--spacing-3,12px)] items-start relative shrink-0 w-full" data-node-id="780:92848">
                <div className="content-stretch flex gap-[var(--spacing-3,12px)] items-center relative shrink-0 w-full" data-node-id="780:92849">
                  <p className="[word-break:break-word] flex-[1_0_0] font-[family-name:var(--font\/family\/inter,'Inter:SemiBold')] font-[var(--font\/weight\/semibold,normal)] h-[20px] leading-[20px] min-w-px opacity-90 relative text-[color:var(--on-surface\/default,#1a1a1a)] text-[length:var(--font\/size\/m,14px)]" data-node-id="780:92850">
                    Payment milestone
                  </p>
                  <div className="content-stretch flex gap-[var(--spacing-1,4px)] items-center relative shrink-0" data-node-id="780:92851" data-name="Link text">
                    <div className="[word-break:break-word] flex flex-col font-[family-name:var(--font\/family\/inter,'Inter:SemiBold')] font-[var(--font\/weight\/semibold,normal)] justify-center leading-[0] relative shrink-0 text-[color:var(--primary\/default,#50f)] text-[length:var(--font\/size\/m,14px)] whitespace-nowrap" data-node-id="I780:92851;2043:1380">
                      <p className="leading-[20px]">{`Reset to default `}</p>
                    </div>
                  </div>
                  <div className="bg-[var(--tertiary-green\/variant2,#edf5ee)] border border-[var(--tertiary-green\/variant1,#daecde)] border-solid content-stretch flex gap-[var(--spacing-1,4px)] items-center justify-center overflow-clip px-[var(--spacing-2,8px)] py-[var(--spacing-1,4px)] relative rounded-[4px] shrink-0" data-node-id="780:92852" data-name="Tag">
                    <div className="[word-break:break-word] flex flex-col font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium justify-center leading-[0] relative shrink-0 text-[color:var(--on-tertiary-green\/variant,#387e47)] text-[length:var(--font\/size\/xs,10px)] uppercase whitespace-nowrap" data-node-id="I780:92852;2015:2210">
                      <p className="leading-[12px]">0%</p>
                    </div>
                  </div>
                </div>
                <div className="border border-[var(--surface\/variant,#e5e5e5)] border-solid content-stretch flex flex-col gap-[var(--spacing-0,0px)] items-start overflow-clip p-[var(--spacing-0,0px)] relative rounded-[var(--radius-1,4px)] shrink-0 w-[512px]" data-node-id="780:92853">
                  <div className="content-stretch flex flex-col gap-[var(--spacing-0,0px)] items-start justify-center overflow-clip p-[var(--spacing-0,0px)] relative shrink-0 w-full" data-node-id="780:92854">
                    <div className="border-[length:var(--border-0,0px)] border-[var(--primary\/default,#50f)] border-solid content-stretch flex gap-[var(--spacing-2,8px)] items-center overflow-clip px-[var(--spacing-4,16px)] py-[var(--spacing-3,12px)] relative shrink-0 w-full" data-node-id="780:92855">
                      <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/secondary,#666)] text-ellipsis w-[16px] whitespace-nowrap" data-node-id="780:92856">
                        1
                      </p>
                      <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] gap-[var(--spacing-2,8px)] items-center min-w-px relative whitespace-nowrap" data-node-id="780:92857">
                        <p className="font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis" data-node-id="780:92858">
                          Deposit
                        </p>
                        <p className="flex-[1_0_0] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[16px] min-w-px overflow-hidden relative text-[12px] text-[color:var(--on-surface\/secondary,#666)] text-ellipsis" data-node-id="780:92859">
                          Upon signing
                        </p>
                      </div>
                      <div className="content-stretch flex flex-col gap-[var(--spacing-1,4px)] items-start relative rounded-[var(--radius-1,4px)] shrink-0 w-[100px]" data-node-id="780:92860" data-name="Text Field">
                        <div className="[word-break:break-word] border border-[var(--on-surface\/border,#ccc)] border-solid content-stretch flex font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal gap-[var(--spacing-1,4px)] h-[36px] items-center leading-[20px] px-[16px] py-[8px] relative rounded-[4px] shrink-0 text-[length:var(--font\/size\/m,14px)] text-right w-full" data-node-id="780:92861" data-name="Text Box">
                          <p className="flex-[1_0_0] min-w-px relative text-[color:var(--on-surface\/default,#1a1a1a)]" data-node-id="780:92862">
                            0
                          </p>
                          <p className="relative shrink-0 text-[color:var(--on-surface\/secondary,#666)] whitespace-nowrap" data-node-id="780:92863">
                            %
                          </p>
                        </div>
                      </div>
                      <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis text-right w-[80px] whitespace-nowrap" data-node-id="780:92864">
                        S$0
                      </p>
                    </div>
                    <div className="border-[var(--surface\/variant,#e5e5e5)] border-b-[length:var(--border-0,0px)] border-l-[length:var(--border-0,0px)] border-r-[length:var(--border-0,0px)] border-solid border-t-[length:var(--border-1,1px)] content-stretch flex gap-[var(--spacing-2,8px)] items-center overflow-clip px-[var(--spacing-4,16px)] py-[var(--spacing-3,12px)] relative shrink-0 w-full" data-node-id="780:92865">
                      <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/secondary,#666)] text-ellipsis w-[16px] whitespace-nowrap" data-node-id="780:92866">
                        2
                      </p>
                      <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] gap-[var(--spacing-2,8px)] items-center min-w-px relative whitespace-nowrap" data-node-id="780:92867">
                        <p className="font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis" data-node-id="780:92868">
                          Commencement
                        </p>
                        <p className="flex-[1_0_0] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[16px] min-w-px overflow-hidden relative text-[12px] text-[color:var(--on-surface\/secondary,#666)] text-ellipsis" data-node-id="780:92869">
                          Works commence
                        </p>
                      </div>
                      <div className="content-stretch flex flex-col gap-[var(--spacing-1,4px)] items-start relative rounded-[var(--radius-1,4px)] shrink-0 w-[100px]" data-node-id="780:92870" data-name="Text Field">
                        <div className="[word-break:break-word] border border-[var(--on-surface\/border,#ccc)] border-solid content-stretch flex font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal gap-[var(--spacing-1,4px)] h-[36px] items-center leading-[20px] px-[16px] py-[8px] relative rounded-[4px] shrink-0 text-[length:var(--font\/size\/m,14px)] text-right w-full" data-node-id="780:92871" data-name="Text Box">
                          <p className="flex-[1_0_0] min-w-px relative text-[color:var(--on-surface\/default,#1a1a1a)]" data-node-id="780:92872">
                            0
                          </p>
                          <p className="relative shrink-0 text-[color:var(--on-surface\/secondary,#666)] whitespace-nowrap" data-node-id="780:92873">
                            %
                          </p>
                        </div>
                      </div>
                      <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis text-right w-[80px] whitespace-nowrap" data-node-id="780:92874">
                        S$0
                      </p>
                    </div>
                    <div className="border-[var(--surface\/variant,#e5e5e5)] border-b-[length:var(--border-0,0px)] border-l-[length:var(--border-0,0px)] border-r-[length:var(--border-0,0px)] border-solid border-t-[length:var(--border-1,1px)] content-stretch flex gap-[var(--spacing-2,8px)] items-center overflow-clip px-[var(--spacing-4,16px)] py-[var(--spacing-3,12px)] relative shrink-0 w-full" data-node-id="780:92875">
                      <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/secondary,#666)] text-ellipsis w-[16px] whitespace-nowrap" data-node-id="780:92876">
                        3
                      </p>
                      <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] gap-[var(--spacing-2,8px)] items-center min-w-px relative whitespace-nowrap" data-node-id="780:92877">
                        <p className="font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis" data-node-id="780:92878">
                          Mid-Project
                        </p>
                        <p className="flex-[1_0_0] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[16px] min-w-px overflow-hidden relative text-[12px] text-[color:var(--on-surface\/secondary,#666)] text-ellipsis" data-node-id="780:92879">
                          50% completion
                        </p>
                      </div>
                      <div className="content-stretch flex flex-col gap-[var(--spacing-1,4px)] items-start relative rounded-[var(--radius-1,4px)] shrink-0 w-[100px]" data-node-id="780:92880" data-name="Text Field">
                        <div className="[word-break:break-word] border border-[var(--on-surface\/border,#ccc)] border-solid content-stretch flex font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal gap-[var(--spacing-1,4px)] h-[36px] items-center leading-[20px] px-[16px] py-[8px] relative rounded-[4px] shrink-0 text-[length:var(--font\/size\/m,14px)] text-right w-full" data-node-id="780:92881" data-name="Text Box">
                          <p className="flex-[1_0_0] min-w-px relative text-[color:var(--on-surface\/default,#1a1a1a)]" data-node-id="780:92882">
                            0
                          </p>
                          <p className="relative shrink-0 text-[color:var(--on-surface\/secondary,#666)] whitespace-nowrap" data-node-id="780:92883">
                            %
                          </p>
                        </div>
                      </div>
                      <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis text-right w-[80px] whitespace-nowrap" data-node-id="780:92884">
                        S$0
                      </p>
                    </div>
                    <div className="border-[var(--surface\/variant,#e5e5e5)] border-b-[length:var(--border-0,0px)] border-l-[length:var(--border-0,0px)] border-r-[length:var(--border-0,0px)] border-solid border-t-[length:var(--border-1,1px)] content-stretch flex gap-[var(--spacing-2,8px)] items-center overflow-clip px-[var(--spacing-4,16px)] py-[var(--spacing-3,12px)] relative shrink-0 w-full" data-node-id="780:92885">
                      <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/secondary,#666)] text-ellipsis w-[16px] whitespace-nowrap" data-node-id="780:92886">
                        4
                      </p>
                      <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] gap-[var(--spacing-2,8px)] items-center min-w-px relative whitespace-nowrap" data-node-id="780:92887">
                        <p className="font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis" data-node-id="780:92888">
                          Completion
                        </p>
                        <p className="flex-[1_0_0] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[16px] min-w-px overflow-hidden relative text-[12px] text-[color:var(--on-surface\/secondary,#666)] text-ellipsis" data-node-id="780:92889">
                          Handover
                        </p>
                      </div>
                      <div className="content-stretch flex flex-col gap-[var(--spacing-1,4px)] items-start relative rounded-[var(--radius-1,4px)] shrink-0 w-[100px]" data-node-id="780:92890" data-name="Text Field">
                        <div className="[word-break:break-word] border border-[var(--on-surface\/border,#ccc)] border-solid content-stretch flex font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal gap-[var(--spacing-1,4px)] h-[36px] items-center leading-[20px] px-[16px] py-[8px] relative rounded-[4px] shrink-0 text-[length:var(--font\/size\/m,14px)] text-right w-full" data-node-id="780:92891" data-name="Text Box">
                          <p className="flex-[1_0_0] min-w-px relative text-[color:var(--on-surface\/default,#1a1a1a)]" data-node-id="780:92892">
                            0
                          </p>
                          <p className="relative shrink-0 text-[color:var(--on-surface\/secondary,#666)] whitespace-nowrap" data-node-id="780:92893">
                            %
                          </p>
                        </div>
                      </div>
                      <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Medium')] font-[var(--font\/weight\/medium,normal)] font-medium leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis text-right w-[80px] whitespace-nowrap" data-node-id="780:92894">
                        S$0
                      </p>
                    </div>
                    <div className="bg-[var(--surface\/bg,#f2f2f2)] border-[var(--surface\/variant,#e5e5e5)] border-b-[length:var(--border-0,0px)] border-l-[length:var(--border-0,0px)] border-r-[length:var(--border-0,0px)] border-solid border-t-[length:var(--border-1,1px)] content-stretch flex gap-[var(--spacing-2,8px)] items-center overflow-clip px-[var(--spacing-4,16px)] py-[var(--spacing-3,12px)] relative shrink-0 w-full" data-node-id="780:92895">
                      <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/secondary,#666)] text-ellipsis w-[16px] whitespace-nowrap" data-node-id="780:92896">{` `}</p>
                      <div className="content-stretch flex flex-[1_0_0] gap-[var(--spacing-2,8px)] items-center min-w-px relative" data-node-id="780:92897">
                        <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Bold')] font-[var(--font\/weight\/bold,normal)] font-bold leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="780:92898">
                          Total
                        </p>
                      </div>
                      <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Bold')] font-[var(--font\/weight\/bold,normal)] font-bold leading-[20px] overflow-hidden relative shrink-0 text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="780:92899">
                        S$70,500
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <Horizontal className="bg-[var(--surface\/variant,#e5e5e5)] h-px relative shrink-0 w-full" />
              <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-node-id="780:92901">
                <div className="content-stretch flex flex-col gap-[var(--spacing-1,4px)] items-start relative rounded-[var(--radius-1,4px)] shrink-0 w-full" data-node-id="780:92902" data-name="Text Field">
                  <div className="border border-[var(--on-surface\/border,#ccc)] border-solid content-stretch flex gap-[8px] h-[48px] items-center pl-[16px] pr-[12px] py-[14px] relative rounded-[4px] shrink-0 w-full" data-node-id="I780:92902;1791:1149" data-name="Text Box">
                    <div className="absolute bg-[var(--surface\/default,white)] content-stretch flex h-px items-center left-[11px] px-[4px] top-[-1px]" data-node-id="I780:92902;2942:1930" data-name="Label">
                      <p className="[word-break:break-word] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal leading-[16px] relative shrink-0 text-[color:var(--on-surface\/secondary,#666)] text-[length:var(--font\/size\/s,12px)] whitespace-nowrap" data-node-id="I780:92902;2942:1931">
                        Project type
                      </p>
                    </div>
                    <p className="[word-break:break-word] flex-[1_0_0] font-[family-name:var(--font\/family\/inter,'Inter:Regular')] font-[var(--font\/weight\/regular,normal)] font-normal h-[20px] leading-[20px] min-w-px overflow-hidden relative text-[14px] text-[color:var(--on-surface\/default,#1a1a1a)] text-ellipsis whitespace-nowrap" data-node-id="I780:92902;1791:1153">
                      Interior Quote File Name
                    </p>
                    <div className="relative shrink-0 size-[20px]" data-node-id="I780:92902;1791:1154" data-name="Trailing Icon">
                      <p className="-translate-x-1/2 [word-break:break-word] absolute font-['Material_Symbols_Rounded:Regular'] font-normal leading-none left-1/2 text-[16px] text-[color:var(--on-surface\/secondary,#666)] text-center top-[calc(50%-8px)] whitespace-nowrap" data-node-id="I780:92902;1791:1155" style={{ fontVariationSettings: '"FILL" 0, "GRAD" 0' }}>
                        expand_more
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bg-[var(--surface\/default,white)] border-[var(--surface\/variant,#e5e5e5)] border-solid border-t bottom-0 content-stretch drop-shadow-[0px_25px_25px_rgba(0,0,0,0.25)] flex gap-[var(--spacing-3,12px)] items-center justify-end left-0 px-[var(--spacing-6,24px)] py-[var(--spacing-4,16px)] right-0" data-node-id="780:92903" data-name="Footer">
          <div className="border border-[var(--on-surface\/border,#ccc)] border-solid content-stretch flex items-center justify-center px-[var(--spacing-4,16px)] py-[var(--spacing-2,8px)] relative rounded-[4px] shrink-0" data-node-id="780:92904" data-name="Buttons">
            <div className="[word-break:break-word] flex flex-col font-[family-name:var(--font\/family\/inter,'Inter:SemiBold')] font-[var(--font\/weight\/semibold,normal)] justify-center leading-[0] relative shrink-0 text-[color:var(--on-surface\/secondary,#666)] text-[length:var(--font\/size\/m,14px)] text-center whitespace-nowrap" data-node-id="I780:92904;1360:458">
              <p className="leading-[20px]">Cancel</p>
            </div>
          </div>
          <div className="bg-[var(--primary\/default,#50f)] content-stretch flex h-[36px] items-center justify-center px-[var(--spacing-4,16px)] py-[var(--spacing-2,8px)] relative rounded-[var(--radius-1,4px)] shrink-0" data-node-id="780:92905" data-name="Buttons">
            <div className="[word-break:break-word] flex flex-col font-[family-name:var(--font\/family\/inter,'Inter:SemiBold')] font-[var(--font\/weight\/semibold,normal)] justify-center leading-[0] relative shrink-0 text-[color:var(--on-primary\/default,white)] text-[length:var(--font\/size\/m,14px)] text-center whitespace-nowrap" data-node-id="I780:92905;1360:782">
              <p className="leading-[20px]">{`Save & Convert to Project`}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}