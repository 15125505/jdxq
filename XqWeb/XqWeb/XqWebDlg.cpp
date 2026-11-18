
// XqWebDlg.cpp: 实现文件
//

#include "pch.h"
#include "framework.h"
#include "XqWeb.h"
#include "XqWebDlg.h"
#include "afxdialogex.h"
#include "tool/FileEx.h"

#ifdef _DEBUG
#define new DEBUG_NEW
#endif

#ifdef _DEBUG
#pragma comment(lib, "cef/lib_d/libcef.lib")
#pragma comment(lib, "cef/lib_d/libcef_dll_wrapper.lib")
#else
#pragma comment(lib, "cef/lib/libcef.lib")
#pragma comment(lib, "cef/lib/libcef_dll_wrapper.lib")
#endif

#define TOP_GAP 0
#define IDM_REFRESH 0x0020



// 用于应用程序“关于”菜单项的 CAboutDlg 对话框

class CAboutDlg : public CDialog
{
public:
	CAboutDlg();

// 对话框数据
#ifdef AFX_DESIGN_TIME
	enum { IDD = IDD_ABOUTBOX };
#endif

	protected:
	virtual void DoDataExchange(CDataExchange* pDX);    // DDX/DDV 支持

// 实现
protected:
	DECLARE_MESSAGE_MAP()
};

CAboutDlg::CAboutDlg() : CDialog(IDD_ABOUTBOX)
{
}

void CAboutDlg::DoDataExchange(CDataExchange* pDX)
{
	CDialog::DoDataExchange(pDX);
}

BEGIN_MESSAGE_MAP(CAboutDlg, CDialog)
END_MESSAGE_MAP()


// CXqWebDlg 对话框



CXqWebDlg::CXqWebDlg(CString strUrl, CWnd* pParent /*=nullptr*/)
	: CDialog(IDD_XQWEB_DIALOG, pParent), m_strUrl(strUrl)
{
	m_hIcon = AfxGetApp()->LoadIcon(IDR_MAINFRAME);
	m_bIsInited = FALSE;
}

void CXqWebDlg::DoDataExchange(CDataExchange* pDX)
{
	CDialog::DoDataExchange(pDX);
}

BEGIN_MESSAGE_MAP(CXqWebDlg, CDialog)
	ON_WM_SYSCOMMAND()
	ON_WM_PAINT()
	ON_WM_QUERYDRAGICON()
	ON_WM_CLOSE()
	ON_WM_SIZE()
	ON_WM_DESTROY()
	ON_BN_CLICKED(IDOK, &CXqWebDlg::OnBnClickedOk)
	ON_BN_CLICKED(IDCANCEL, &CXqWebDlg::OnBnClickedCancel)
	ON_WM_TIMER()
END_MESSAGE_MAP()


// CXqWebDlg 消息处理程序

BOOL CXqWebDlg::OnInitDialog()
{
	CDialog::OnInitDialog();

	// 将“关于...”菜单项添加到系统菜单中。

	// IDM_ABOUTBOX 必须在系统命令范围内。
	ASSERT((IDM_ABOUTBOX & 0xFFF0) == IDM_ABOUTBOX);
	ASSERT(IDM_ABOUTBOX < 0xF000);

	CMenu* pSysMenu = GetSystemMenu(FALSE);
	if (pSysMenu != nullptr)
	{
		BOOL bNameValid;
		CString strAboutMenu;
		bNameValid = strAboutMenu.LoadString(IDS_ABOUTBOX);
		ASSERT(bNameValid);
		if (!strAboutMenu.IsEmpty())
		{
			pSysMenu->AppendMenu(MF_SEPARATOR);
			pSysMenu->AppendMenu(MF_STRING, IDM_ABOUTBOX, strAboutMenu);
			pSysMenu->AppendMenu(MF_STRING, IDM_REFRESH, "重新载入(&R)");
		}
	}

	// 设置此对话框的图标。  当应用程序主窗口不是对话框时，框架将自动
	//  执行此操作
	SetIcon(m_hIcon, TRUE);			// 设置大图标
	SetIcon(m_hIcon, FALSE);		// 设置小图标


	// 启动定时器
	SetTimer(1, 50, NULL);

	// 获取标题栏高度
	CRect rcClient, rcWnd;
	GetClientRect(rcClient);
	GetWindowRect(rcWnd);
	

	// 设置窗口缺省大小
	int nScreenHeight = GetSystemMetrics(SM_CYSCREEN); // 获取屏幕垂直分辨率
	int nClientHeight = nScreenHeight / 4 * 3;
	int nClientWidth = nClientHeight * 9 / 16;
	int nWidth = nClientWidth + rcWnd.Width() - rcClient.Width();
	int nHeight = nClientHeight + rcWnd.Height() - rcClient.Height();
	MoveWindow(0, 0, nWidth, nHeight);
	CenterWindow();

	// cef相关初始化
	CefRefPtr<CSimpleClient> client(new CSimpleClient(m_hWnd));
	m_simpleClient = client;
	USES_CONVERSION;
	CefSettings settings;
	CefSettingsTraits::init(&settings);
	settings.multi_threaded_message_loop = true;
	CefString(&settings.cache_path).FromWString(A2W((Tool::CFileEx::GetExeDirectory() + "\\XqWeb").c_str()));	// 加入这句代码之后，才能在网页中使用localStrorage
	settings.log_severity = LOGSEVERITY_DISABLE;	// 加入这句代码是关闭日志
	settings.single_process = true;

	CefMainArgs mainArgs;
	CefInitialize(mainArgs, settings, m_simpleClient, NULL);

	RECT rect;
	GetClientRect(&rect);
	RECT rectnew = rect;
	rectnew.top = rect.top + TOP_GAP;
	rectnew.bottom = rect.bottom;
	rectnew.left = rect.left;
	rectnew.right = rect.right;

	CefWindowInfo winInfo;
	winInfo.SetAsChild(GetSafeHwnd(), rectnew);
	CefBrowserSettings browserSettings;
	//CefBrowserHost::CreateBrowser(winInfo, m_simpleClient, _T("http://server-13.example.invalid/weile/hulaisg/?timestamp=1664019350735&sdkverify=00000000000000000000000000000000&openId=wl_tavl2mipaaag036a&accessToken=00000000000000000000000000000000&nonceStr=wl_tavl2mipaaag036a1664019350875&apiSvr=aDVhcGkud2VpbGUuY29t&sign=00000000000000000000000000000000&iconShow=false&jssdkVersion=2.0.0&payurl=aHR0cHM6Ly9tb2JpbGUuaml4aWFuZy5jbi9tcC13ZWlsZS9wYXkuaHRtbA==&wxpubconfig=aHR0cHM6Ly93ZWlsZS1oNS1tcC5qaXhpYW5nLmNuL2g1L2NvbmZpZw==&appid=925142839025&wxopenid=onUyd6idkRvz5FUgN7hNpAEX93O4"), browserSettings, NULL);
	CefBrowserHost::CreateBrowser(winInfo, m_simpleClient, (LPCSTR)m_strUrl, browserSettings, NULL);
	//CefBrowserHost::CreateBrowser(winInfo, m_simpleClient, _T("file:///X:/_web/test/dist/test.html"), browserSettings, NULL);

	return TRUE;  // 除非将焦点设置到控件，否则返回 TRUE
}

void CXqWebDlg::OnSysCommand(UINT nID, LPARAM lParam)
{
	if ((nID & 0xFFF0) == IDM_ABOUTBOX)
	{
		CAboutDlg dlgAbout;
		dlgAbout.DoModal();
	}
	if ((nID & 0xFFF0) == IDM_REFRESH)
	{
		m_simpleClient->GetBrowser()->Reload();
	}
	else
	{
		CDialog::OnSysCommand(nID, lParam);
	}
}

// 如果向对话框添加最小化按钮，则需要下面的代码
//  来绘制该图标。  对于使用文档/视图模型的 MFC 应用程序，
//  这将由框架自动完成。

void CXqWebDlg::OnPaint()
{
	if (IsIconic())
	{
		CPaintDC dc(this); // 用于绘制的设备上下文

		SendMessage(WM_ICONERASEBKGND, reinterpret_cast<WPARAM>(dc.GetSafeHdc()), 0);

		// 使图标在工作区矩形中居中
		int cxIcon = GetSystemMetrics(SM_CXICON);
		int cyIcon = GetSystemMetrics(SM_CYICON);
		CRect rect;
		GetClientRect(&rect);
		int x = (rect.Width() - cxIcon + 1) / 2;
		int y = (rect.Height() - cyIcon + 1) / 2;

		// 绘制图标
		dc.DrawIcon(x, y, m_hIcon);
	}
	else
	{
		CDialog::OnPaint();
	}
}

//当用户拖动最小化窗口时系统调用此函数取得光标
//显示。
HCURSOR CXqWebDlg::OnQueryDragIcon()
{
	return static_cast<HCURSOR>(m_hIcon);
}


void CXqWebDlg::OnClose()
{
	CDialog::OnClose();
}


void CXqWebDlg::OnSize(UINT nType, int cx, int cy)
{
	CDialog::OnSize(nType, cx, cy);

	if (m_simpleClient.get())
	{
		RECT rect;
		GetClientRect(&rect);
		CefRefPtr<CefBrowser> browser = m_simpleClient->GetBrowser();
		if (browser)
		{
			CefWindowHandle hwnd = browser->GetHost()->GetWindowHandle();
			::MoveWindow(hwnd, 0, TOP_GAP, rect.right - rect.left, rect.bottom - TOP_GAP, true);
		}
	}
}

void CXqWebDlg::OnDestroy()
{
	CefShutdown();
	CDialog::OnDestroy();
}


void CXqWebDlg::OnBnClickedOk()
{
}


void CXqWebDlg::OnBnClickedCancel()
{
	CDialog::OnCancel();
}


void CXqWebDlg::OnTimer(UINT_PTR nIDEvent)
{
	CDialog::OnTimer(nIDEvent);
}