
// CefSgDlg.cpp: 实现文件
//

#include "pch.h"
#include "framework.h"
#include "CefSg.h"
#include "CefSgDlg.h"
#include "afxdialogex.h"
#include "tool/FileEx.h"
#include "tool/TBuff.h"
#include "tool/Encrypt.h"
#include <tlhelp32.h>
#include <minidumpapiset.h>

#ifdef _DEBUG
#define new DEBUG_NEW
#endif

// todo: 首先，需要删除本地开启服务的代码
// todo: 启动的时候，自动从服务器获取最新的本地代码
// todo: 每隔一个小时，自动从服务器获取最新的代码，连续3个小时获取最新代码失败，则软件自动停止

#define WM_JS_MSG (WM_USER + 1234)



// CCefSgDlg 对话框

#ifdef _DEBUG
#pragma comment(lib, "cef/lib_d/libcef.lib")
#pragma comment(lib, "cef/lib_d/libcef_dll_wrapper.lib")
#else
#pragma comment(lib, "cef/lib/libcef.lib")
#pragma comment(lib, "cef/lib/libcef_dll_wrapper.lib")
#endif

#pragma comment(lib, "Dbghelp.lib")
#pragma comment(lib, "Psapi.lib")
#pragma comment(lib, "Advapi32.lib")

void WLog(LPCSTR lpszLog)
{
	FILE* pFile = NULL;
	fopen_s(&pFile, "tmp.log", "a");
	if (NULL == pFile)
	{
		return;
	}
	fprintf(pFile, "%s\n", lpszLog);
	fclose(pFile);
}

FILE* gFile = NULL;


CCefSgDlg::CCefSgDlg(CProcess &process, CWnd* pParent /*=nullptr*/)
	: m_Process(process), CDialog(IDD_CEFSG_DIALOG, pParent)
{
	m_hIcon = AfxGetApp()->LoadIcon(IDR_MAINFRAME);
	m_bStop = false;
	m_hThread = NULL;
	m_bStopUpdate = false;
	m_hUpdate = NULL;
	m_bIsInited = FALSE;
}

void CCefSgDlg::DoDataExchange(CDataExchange* pDX)
{
	CDialog::DoDataExchange(pDX);
}

BEGIN_MESSAGE_MAP(CCefSgDlg, CDialog)
	ON_WM_PAINT()
	ON_WM_QUERYDRAGICON()
	ON_WM_CLOSE()
	ON_WM_SIZE()
	ON_WM_DESTROY()
	ON_BN_CLICKED(IDOK, &CCefSgDlg::OnBnClickedOk)
	ON_BN_CLICKED(IDCANCEL, &CCefSgDlg::OnBnClickedCancel)
	ON_WM_TIMER()
	ON_BN_CLICKED(IDC_REFRESH, &CCefSgDlg::OnBnClickedRefresh)
	ON_MESSAGE(WM_JS_MSG, &CCefSgDlg::OnJsMsg)
END_MESSAGE_MAP()


// CCefSgDlg 消息处理程序

BOOL CCefSgDlg::OnInitDialog()
{
	CDialog::OnInitDialog();

	// 设置此对话框的图标。  当应用程序主窗口不是对话框时，框架将自动
	//  执行此操作
	SetIcon(m_hIcon, TRUE);			// 设置大图标
	SetIcon(m_hIcon, FALSE);		// 设置小图标

	// 启动定时器
	SetTimer(1, 50, NULL);

	// 检查当前是否为测试版本，如果是测试版本，那么在当前标题栏加上一个测试
	if (m_Process.IsTest())
	{
		CString strTitle;
		GetWindowText(strTitle);
		strTitle += " - 测试";
		SetWindowText(strTitle);
	}

	// cef相关初始化
	CefRefPtr<CSimpleClient> client(new CSimpleClient(m_hWnd));
	m_simpleClient = client;

	CefSettings settings;
	CefSettingsTraits::init(&settings);
	settings.multi_threaded_message_loop = true;
	USES_CONVERSION;
	CefString(&settings.cache_path).FromWString(A2W((Tool::CFileEx::GetExeDirectory() + "\\cache").c_str()));	// 加入这句代码之后，才能在网页中使用localStrorage
	//CefString(&settings.user_agent).FromASCII("MyUA");	// 设置UserAgent
	settings.log_severity = LOGSEVERITY_DISABLE;	// 加入这句代码是关闭日志
	settings.single_process = true;

	CefMainArgs mainArgs;
	CefInitialize(mainArgs, settings, m_simpleClient, NULL);

	RECT rect;
	GetClientRect(&rect);
	RECT rectnew = rect;
	rectnew.top = rect.top;
	rectnew.bottom = rect.bottom;
	rectnew.left = rect.left;
	rectnew.right = rect.right;

	CefWindowInfo winInfo;
	winInfo.SetAsChild(GetSafeHwnd(), rectnew);
	CefBrowserSettings browserSettings;
	CefBrowserHost::CreateBrowser(winInfo, m_simpleClient, _T("about:blank"), browserSettings, NULL);

	// 启动版本更新线程
	m_bStopUpdate = false;
	m_hUpdate = AfxBeginThread(TH_Update, this)->m_hThread;


	return TRUE;  // 除非将焦点设置到控件，否则返回 TRUE
}

// 如果向对话框添加最小化按钮，则需要下面的代码
//  来绘制该图标。  对于使用文档/视图模型的 MFC 应用程序，
//  这将由框架自动完成。

void CCefSgDlg::OnPaint()
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
HCURSOR CCefSgDlg::OnQueryDragIcon()
{
	return static_cast<HCURSOR>(m_hIcon);
}


void CCefSgDlg::OnClose()
{
	CDialog::OnClose();
}


void CCefSgDlg::OnSize(UINT nType, int cx, int cy)
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
			::MoveWindow(hwnd, 0, 0, rect.right - rect.left, rect.bottom, true);
		}
	}
}

void CCefSgDlg::OnDestroy()
{
	CefShutdown();
	if (NULL != m_hUpdate)
	{
		m_bStopUpdate = true;
		WaitForSingleObject(m_hUpdate, INFINITE);
	}
	CDialog::OnDestroy();
}


void CCefSgDlg::OnBnClickedOk()
{
	if (NULL != m_hThread)
	{
		Log("正在侦测！");
		return;
	}
	Log("开始侦测...");
	m_bStop = false;
	m_hThread = AfxBeginThread(TH_Work, (LPVOID)this)->m_hThread;
}


void CCefSgDlg::OnBnClickedRefresh()
{
	auto frame = m_simpleClient->GetBrowser()->GetMainFrame();
	frame->LoadString(IndexHtml().c_str(), "http://127.0.0.1:20126");
}


void CCefSgDlg::OnBnClickedCancel()
{
	if (NULL != m_hThread)
	{
		Log("侦测中不允许退出！");
		m_bStop = true;
		return;
	}
	CDialog::OnCancel();
}


void CCefSgDlg::OnTimer(UINT_PTR nIDEvent)
{
	// 检查浏览器状态
	CheckBrowser();

	// 取出待处理的日志
	static std::vector<std::string> vec;
	m_csLock.Lock();
	vec.clear();
	vec.swap(m_vecJs);
	m_csLock.Unlock();

	// 开始处理日志
	for (size_t i = 0; i < vec.size(); i++)
	{
		ExeJs(vec[i].c_str());
	}

	// 检查浏览器消息
	std::string strMsg;
	if (MsgPool::GetMsg(strMsg) && m_hThread == NULL)
	{
		std::vector<MsgPool::ProcessCheck> vecProcess;
		std::vector<MsgPool::DataCheck> vecData;
		if (MsgPool::GetProcessVec(strMsg, vecProcess))
		{
			m_vecProcess = vecProcess;
		}
		else if (MsgPool::GetDataVec(strMsg, vecData))
		{
			m_vecProb.clear();
			for (size_t i=0; i<vecData.size(); i++)
			{
				auto data = vecData[i];
				ProbNode node(data.name.c_str(), data.begin.c_str(), data.end.c_str());
				for (size_t j=0; j<data.vec.size(); j++)
				{
					node.vecFind.push_back(data.vec[j]);
				}
				m_vecProb.push_back(node);
			}
		}
	}


	CDialog::OnTimer(nIDEvent);
}

BOOL CCefSgDlg::ExeJs(LPCSTR lpszCode)
{
	auto frame = m_simpleClient->GetBrowser()->GetMainFrame();
	frame->ExecuteJavaScript(lpszCode, frame->GetURL(), 0);
	return TRUE;
}


UINT CCefSgDlg::TH_Work(LPVOID lpContext)
{
	CCefSgDlg* pThis = (CCefSgDlg*)lpContext;
	pThis->Work();
	pThis->m_hThread = NULL;
	return 0;
}


void CCefSgDlg::Work()
{
	// 初始化探测列表
	for (size_t i = 0; i < m_vecProb.size(); i++)
	{
		m_vecProb[i].Clear();
	}
	m_mapTag.clear();

	//SetDumpPrivileges();

	// 首先保证进度条为0
	ExeJsSafe("updateProgress(0)");

	// 获取游戏进程ID
	BOOL bIsQQ = FALSE;
	std::vector<DWORD> vecPid;
	FindProcessId(bIsQQ, vecPid);
	if (vecPid.size() == 0)
	{
		Log("没有找到对应的游戏窗口！");
		return;
	}

	for (size_t index = 0; index < vecPid.size(); index++)
	{
		DWORD dwPID = vecPid[index];
		// 读取进程内存信息
		if (!ProcessGameMem(dwPID, bIsQQ))
		{
			Log("游戏进程处理失败（一般原因：游戏启动时的权限高于小乔。解决方法1：以管理员权限启动小乔。解决方法2：以普通用户权限重新启动微信或模拟器。）");
			continue;;
		}


		// 输出结果
		BOOL bFail = FALSE;
		std::string str = "userIn({";

		// 探测到的节点加入进去
		for (size_t i = 0; i < m_vecProb.size(); i++)
		{
			auto& node = m_vecProb[i];

			// 任何字段没有找到，都是不允许的
			if (node.nCount == 0)
			{
				bFail = TRUE;
				Log((node.strTag.substr(0, 2) + "未能成功获取").c_str());
				continue;
			}
			str += node.strTag + ":" + node.strValue + ",";
		}
		str += "})";
		if (!bFail)
		{
			TRACE("---开始执行%s\n", str.c_str());
			ExeJsSafe(str.c_str());
			return;
		}
		if (index + 1 < vecPid.size())
		{
			Log("下面将继续尝试不同方式的侦测...");
		}
	}
}

UINT CCefSgDlg::TH_Update(LPVOID lpContext)
{
	CCefSgDlg* pThis = (CCefSgDlg*)lpContext;
	pThis->Update();
	pThis->m_hUpdate = NULL;
	return 0;
}

void CCefSgDlg::Update()
{
	DWORD dwLast = GetTickCount();
	int nFail = 0;
	while (!m_bStopUpdate)
	{
		// 距离上次更新时间小于1小时，直接返回
		if (GetTickCount() - dwLast < 3600 * 1000)
		{
			Sleep(100);
			continue;
		}
		TRACE("开始更新文件\n");
		dwLast = GetTickCount();

		// 更新内存中的数据
		if (m_Process.UpdateIndex() == 0 && m_Process.UpdateMain() == 0)
		{
			nFail = 0;
		}
		else if (++nFail == 3)
		{
			TRACE("连续3次未能更新成功...\n");
			m_Process.ClearMemFile();
		}

	}
}

// 获取指定文件的内容
BOOL CCefSgDlg::GetFileContent(LPCSTR lpszFilePath, std::string& sContent)
{
	// 设置当前目录为exe目录
	std::string strFolder = Tool::CFileEx::GetExeDirectory().c_str();

	// 首先读取文件
	Tool::TBuff<byte> bufEncode;
	byte buff[1024];
	size_t nRead = 0;
	FILE* pFile = NULL;
	std::string strFile = strFolder + lpszFilePath;
	fopen_s(&pFile, strFile.c_str(), "rb");
	if (NULL == pFile)
	{
		return FALSE;
	}
	
	// 读取所有内容
	while (nRead = fread_s(buff, 1024, 1, 1024, pFile))
	{
		bufEncode.append(buff, nRead);
	}
	fclose(pFile);
	sContent.clear();
	sContent.append((char*)&bufEncode[0], bufEncode.size());
	return TRUE;
}

/*******************************************************************************
* 功能描述：	在网页上输出日志。
* 输入参数：	lszLog -- 需要输出的日志内容
* 输出参数：
* 其它说明：
* 修改日期		修改人			修改内容
* ------------------------------------------------------------------------------
* 2020-05-02	作者	      	创建
*******************************************************************************/
void CCefSgDlg::Log(LPCSTR lpszLog)
{
	CString str;
	str.Format("zlog(\"%s\")", lpszLog);
	Tool::CEncrypt en;
	ExeJsSafe(en.GB2312ToUtf8(str).c_str());
}

void CCefSgDlg::ExeJsSafe(LPCSTR lpszCode)
{
	m_csLock.Lock();
	m_vecJs.push_back(std::string(lpszCode));
	m_csLock.Unlock();
}

/*******************************************************************************
* 功能描述：	找到胡莱三国游戏进程ID
* 输入参数：
* 输出参数：
* 其它说明：
* 修改日期		修改人			修改内容
* ------------------------------------------------------------------------------
* 2020-05-01	作者	      	创建
*******************************************************************************/
void CCefSgDlg::FindProcessId(BOOL &bIsQQ, std::vector<DWORD> &vecPid)
{
	vecPid.clear();
	CWnd* pWndGame = NULL;
	DWORD dwPid = 0;
	bIsQQ = FALSE;


	// 首先寻找进程
	for (size_t i=0; i<m_vecProcess.size(); i++)
	{
		const auto& node = m_vecProcess[i];
		bIsQQ = FALSE;

		// 如果窗口类名存在，那么查找对应的窗口，然后找到对应的进程
		if (!node.strClassName.empty() || !node.strWindowName.empty())
		{
			pWndGame = CWnd::FindWindow(node.strClassName.c_str(), node.strWindowName.c_str());
			if (NULL != pWndGame)
			{
				Log("检测到游戏窗口：" + CString(node.strWindowName.c_str()));
				GetWindowThreadProcessId(pWndGame->GetSafeHwnd(), &dwPid);
			}
		}

		// 如果金成民存在，那么按照进程名进行查找
		if (!node.strProcessName.empty())
		{
			FindProcess(node.strProcessName, dwPid);
			bIsQQ = TRUE;
		}

		// 如果没有找到进程，直接跳过本轮
		if (dwPid == 0)
		{
			continue;
		}


		// 如果需要查找子进程，那么进行子进程的查找
		vecPid.push_back(dwPid);
		if (node.bFindInChildProcess)
		{
			std::vector<DWORD> vec = GetProceeIDfromParentID(dwPid);
			vecPid.insert(vecPid.end(), vec.rbegin(), vec.rend());
		}

		// 只要找到了任意目标进程，就不进行其它条件筛选
		if (vecPid.size() > 0)
		{
			break;
		}
	}

	return;
}




CTime CCefSgDlg::GetProcessTime(DWORD dwProcessId)
{
	CTime ret;
	HANDLE process = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, FALSE, dwProcessId);
	if (NULL == process)
	{
		return ret;
	}
	FILETIME ftCreation, ftExit, ftKernel, ftUser;
	if (GetProcessTimes(process, &ftCreation, &ftExit, &ftKernel, &ftUser)) 
	{
		ret = CTime(ftCreation);
	}
	CloseHandle(process);
	return ret;
}

std::vector<DWORD> CCefSgDlg::GetProceeIDfromParentID(DWORD dwParentProcessId)
{
	std::vector<DWORD> parent_id_vec;
	DWORD dwProcessID = 0;

	//进行一个进程快照
	HANDLE hProcessSnap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
	if (hProcessSnap == INVALID_HANDLE_VALUE)
	{
		return parent_id_vec;
	}

	//遍历所有进程
	PROCESSENTRY32 pe;
	TCHAR procID[300] = { 0 };
	pe.dwSize = sizeof(pe);
	BOOL bProcess = Process32First(hProcessSnap, &pe);
	while (bProcess)
	{
		if (pe.th32ParentProcessID == dwParentProcessId)//判断如果父id与其pid相等，
		{

			dwProcessID = pe.th32ProcessID;
			parent_id_vec.push_back(dwProcessID);
		}
		bProcess = Process32Next(hProcessSnap, &pe);
	}
	CloseHandle(hProcessSnap);
	return parent_id_vec;
}


/*******************************************************************************
* 功能描述：	读取游戏进程的内存并处理
* 输入参数：
* 输出参数：
* 返 回 值：	执行成功返回TRUE，否则返回FALSE。
* 其它说明：
* 修改日期		修改人			修改内容
* ------------------------------------------------------------------------------
* 2020-05-01	作者	      	创建
*******************************************************************************/
BOOL CCefSgDlg::ProcessGameMem(DWORD dwPID, BOOL bIsQQ)
{

	// 创建转储文件
	CString strFilePath;
	if (!CreateDumpFile(dwPID, strFilePath))
	{
		return ProcessGameMemOld(dwPID);
	}

	// 读取转储文件
	FILE* pFile = NULL;
	fopen_s(&pFile, strFilePath, "rb");
	if (NULL == pFile)
	{
		return FALSE;
	}

	// 获取文件大小
	fseek(pFile, 0, SEEK_END);
	auto nFileSize = ftell(pFile);

	// 依次读取文件内容
	Tool::TBuff<byte> buff(1024 * 1024);
	buff.resize(1024 * 1024);
	fseek(pFile, 0, SEEK_SET);
	int nCount = 0, nMaxCount = nFileSize / 1024 / 1024 + 1;
	while (true)
	{
		// 读取内容并进行检查
		auto nRead = fread(&buff[0], 1, buff.size(), pFile);
		if (nRead == 0)
		{
			break;
		}
		CheckMem(&buff[0], nRead);

		// 每读取10M输出依次进度条
		if (nCount++ % 10 == 0)
		{
			CString str;
			m_nPercent = nCount * 1000 / nMaxCount;
			str.Format("updateProgress(%d)", m_nPercent);
			ExeJsSafe(str);
		}
	}
	ExeJsSafe("updateProgress(1000)");
	fclose(pFile);
	return TRUE;
}

BOOL CCefSgDlg::ProcessGameMemOld(DWORD dwPID)
{
	// 打开进程
	HANDLE hProcess = OpenProcess(PROCESS_ALL_ACCESS, FALSE, dwPID);
	if (NULL == hProcess)
	{
		TRACE("访问游戏失败！ --- %d\n", GetLastError());
		return FALSE;
	}

	// 读取进程内存
	Tool::TBuff<byte> buff(1024 * 1024);
	buff.resize(1024 * 1024);
	DWORD dwRead = 0;
	unsigned long nMax = 0x80000000;
	for (unsigned long i = 0x00000000; i < nMax && !m_bStop; i += 1024 * 1024)
	{
		BOOL bRet = ReadProcessMemory(hProcess, (LPCVOID)i, &buff[0], 1024 * 1024, &dwRead);
		if (bRet)
		{
			CheckMem(&buff[0], dwRead);
		}
		if (i % 100 == 0)
		{
			CString str;
			m_nPercent = i / (nMax / 1000);
			str.Format("updateProgress(%d)", m_nPercent);
			ExeJsSafe(str);
		}
	}
	ExeJsSafe("updateProgress(1000)");

	// 关闭进程句柄
	CloseHandle(hProcess);
	return TRUE;
}


/*******************************************************************************
* 功能描述：	检查内存数据，提取需要的内容
* 输入参数：
* 输出参数：
* 返 回 值：	执行成功返回TRUE，否则返回FALSE。
* 其它说明：
* 修改日期		修改人			修改内容
* ------------------------------------------------------------------------------
* 2020-05-01	作者	      	创建
*******************************************************************************/
BOOL CCefSgDlg::CheckMem(byte* pBuff, DWORD dwLen)
{
	Tool::TBuff<byte> buff;
	for (size_t i = 0; i < m_vecProb.size(); i++)
	{
		ProbNode& node = m_vecProb[i];
		if (node.strBegin.length() != 0 || node.vecFind.size() > 0)
		{
			GetBetween(pBuff, dwLen, node);
		}
		else
		{
			buff.clear();
			buff.append(byte(0xa0 + node.strTag.length()));
			buff.append((byte*)node.strTag.c_str(), node.strTag.length());
			GetValue(pBuff, dwLen, node, buff);
		}
	}
	return TRUE;
}

/*******************************************************************************
* 功能描述：	读取内存中指定字段的内容
* 输入参数：
* 输出参数：
* 返 回 值：	执行成功返回TRUE，否则返回FALSE。
* 其它说明：
* 修改日期		修改人			修改内容
* ------------------------------------------------------------------------------
* 2020-05-01	作者	      	创建
*******************************************************************************/
#define CHECK_LEN(len) if (i + len > nLen) {TRACE("缓冲区已经读取完了！\n"); break;}
#define READ_NUM(t) CHECK_LEN(sizeof(t)); ChangeBuf(pBuff + i, sizeof(t)); t v = *(t *)(pBuff + i); i+=sizeof(t);
#define READ_STR(t) READ_NUM(t); CHECK_LEN(v); std::string str; str.append((char *)(pBuff + i), v); i += v;
BOOL CCefSgDlg::GetValue(byte* pBuff, size_t nLen, ProbNode &node, Tool::TBuff<byte> &buff)
{
	CString strValue;

	// 保证起始字段后面有足够的长度
	for (size_t i = 0; i < nLen - buff.size() - 1; i++)
	{
		// 找到匹配的位置
		BOOL bSame = TRUE;
		for (size_t j = 0; j < buff.size(); j++)
		{
			if (pBuff[i + j] != byte(buff[j]))
			{
				bSame = FALSE;
				break;
			}
		}
		if (!bSame)
		{
			continue;
		}

		// 找到了匹配的位置，读取一个字节
		i += buff.size();
		byte flag = pBuff[i++];

		// 根据flag解析内容
		if (flag >= 0 && flag <= 127)
		{
			//TRACE("当前是一个数值：%d\n", flag);
			strValue.Format("%d", flag);
			node.Add((LPCSTR)strValue, this);
		}
		else if (flag >= 160 && flag <= 191)
		{
			size_t v = flag - 160;
			CHECK_LEN(v);
			std::string str;
			str.append((char*)(pBuff + i), v);
			i += v;
			strValue.Format("'%s'", str.c_str());
			node.Add((LPCSTR)strValue, this);
		}
		else if (flag == 204)
		{
			READ_NUM(byte);
			strValue.Format("%u", v);
			node.Add((LPCSTR)strValue, this);
			TRACE("当前是一个1字节无符号数值: <%u>\n", v);
		}
		else if (flag == 205)
		{
			READ_NUM(WORD);
			TRACE("当前是一个2字节无符号数值: <%u>\n", v);
			strValue.Format("%u", v);
			node.Add((LPCSTR)strValue, this);
		}
		else if (flag == 206)
		{
			READ_NUM(DWORD);
			strValue.Format("%u", v);
			node.Add((LPCSTR)strValue, this);
			TRACE("当前是一个4字节无符号数值: <%u>\n", v);
		}
		else if (flag == 207)
		{
			READ_NUM(UINT64);
			strValue.Format("%I64u", v);
			node.Add((LPCSTR)strValue, this);
			TRACE("当前是一个8字节无符号数值: <%I64u>\n", v);
		}
		else if (flag == 208)
		{
			READ_NUM(char);
			strValue.Format("%d", v);
			node.Add((LPCSTR)strValue, this);
			TRACE("当前是一个1字节数值: <%d>\n", v);
		}
		else if (flag == 209)
		{
			READ_NUM(short);
			strValue.Format("%d", v);
			node.Add((LPCSTR)strValue, this);
			TRACE("当前是一个2字节数值: <%d>\n", v);
		}
		else if (flag == 210)
		{
			READ_NUM(int);
			strValue.Format("%d", v);
			node.Add((LPCSTR)strValue, this);
			TRACE("当前是一个4字节数值: <%d>\n", v);
		}
		else if (flag == 211)
		{
			READ_NUM(INT64);
			strValue.Format("%I64d", v);
			node.Add((LPCSTR)strValue, this);
			TRACE("当前是一个8字节数值: <%I64d>\n", v);
		}
		else if (flag == 217)
		{
			READ_STR(byte);
			strValue.Format("'%s'", str.c_str());
			node.Add((LPCSTR)strValue, this);
			TRACE("当前是一个1字节长度以内的字符串：<%s>\n", str.c_str());
		}
		else if (flag == 218)
		{
			READ_STR(WORD);
			strValue.Format("'%s'", str.c_str());
			node.Add((LPCSTR)strValue, this);
			TRACE("当前是一个2字节长度以内的字符串：<%s>\n", str.c_str());
		}
		else if (flag == 219)
		{
			READ_STR(DWORD);
			strValue.Format("'%s'", str.c_str());
			node.Add((LPCSTR)strValue, this);
			TRACE("当前是一个4字节长度以内的字符串：<%s>\n", str.c_str());
		}
	}

	return TRUE;
}

BOOL CCefSgDlg::GetBetween(byte* pBuff, size_t nLen, const std::string& strBegin, const std::string& strEnd, std::string& strRet)
{
	// 找到字段1的位置
	size_t pos1 = -1, pos2 = -1;
	for (size_t i = 0; i < nLen - strBegin.length() + 1; i++)
	{
		// 找到匹配的位置
		BOOL bSame = TRUE;
		for (size_t j = 0; j < strBegin.length(); j++)
		{
			if (pBuff[i + j] != byte(strBegin[j]))
			{
				bSame = FALSE;
				break;
			}
		}
		if (!bSame)
		{
			continue;
		}
		pos1 = i;
		break;
	}
	if (pos1 == -1)
	{
		return FALSE;
	}
	pos1 += strBegin.length();

	// 找到字段2的位置
	for (size_t i = pos1; i < nLen - strEnd.length() + 1; i++)
	{
		// 找到匹配的位置
		BOOL bSame = TRUE;
		for (size_t j = 0; j < strEnd.length(); j++)
		{
			if (pBuff[i + j] != byte(strEnd[j]))
			{
				bSame = FALSE;
				break;
			}
		}
		if (!bSame)
		{
			continue;
		}
		pos2 = i;
		break;
	}
	if (pos2 == -1)
	{
		return FALSE;
	}

	// 读取字符串内容
	strRet.clear();
	strRet.append((char*)pBuff + pos1, pos2 - pos1);

	//CString str;
	//str.Format("解析到的字符串内容是：(%s) %s", strRet.c_str(), node.strTag.c_str());
	//Log(str);


	auto badPos = strRet.find_first_not_of("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=:-.");
	if (badPos != std::string::npos)
	{
		//WLog("找到乱码");
		return FALSE;
	}

	return TRUE;

}

BOOL CCefSgDlg::GetBetween(byte* pBuff, size_t nLen, ProbNode &node)
{
	std::string strRet;
	if (node.strBegin.length() > 0 && GetBetween(pBuff, nLen, node.strBegin, node.strEnd, strRet))
	{
		node.Add("'" + strRet + "'", this);
	}
	for (size_t i = 0; i < node.vecFind.size(); i++)
	{
		if (GetBetween(pBuff, nLen, node.vecFind[i].first, node.vecFind[i].second, strRet))
		{
			node.Add("'" + strRet + "'", this);
		}
	}
	return TRUE;
}

void CCefSgDlg::AddMapNode(std::string strTag, LPCSTR strValue)
{
	strTag.erase(0, 1);
	std::map<std::string, std::map<std::string, int>>::iterator it = m_mapTag.find(strTag);
	if (it == m_mapTag.end())
	{
		m_mapTag[strTag] = std::map<std::string, int>();
	}
	std::map<std::string, int>& m = m_mapTag[strTag];
	m[strValue]++;
}

/*******************************************************************************
* 功能描述：	在字典中找到tag对应的实际值，该值为出现最多的那个值
* 输入参数：
* 输出参数：
* 返 回 值：	执行成功返回TRUE，否则返回FALSE。
* 其它说明：
* 修改日期		修改人			修改内容
* ------------------------------------------------------------------------------
* 2020-05-02	作者	      	创建
*******************************************************************************/
BOOL CCefSgDlg::GetData(std::string strTag, std::string& strValue)
{
	std::map<std::string, std::map<std::string, int>>::iterator it = m_mapTag.find(strTag);
	if (it == m_mapTag.end())
	{
		return FALSE;
	}
	std::map<std::string, int>& m = it->second;
	int nMax = 0;
	for (std::map<std::string, int>::iterator it1 = m.begin(); it1 != m.end(); ++it1)
	{
		if (it1->second > nMax)
		{
			strValue = it1->first;
			nMax = it1->second;
		}
	}
	return nMax > 0;
}

/*******************************************************************************
* 功能描述：	检查浏览器创建状态
* 其它说明：	因为浏览器是异步创建成功的，因此在初始化的时候，浏览器并没有被创建成功
* 修改日期		修改人			修改内容
* ------------------------------------------------------------------------------
* 2020-05-17	作者	      	创建
*******************************************************************************/
void CCefSgDlg::CheckBrowser()
{
	// 避免重复初始化
	if (m_bIsInited)
	{
		return;
	}

	// 如果浏览器初始化成功，就自动加载页面
	CefRefPtr<CefBrowser> browser = m_simpleClient->GetBrowser();
	if (browser)
	{
		m_bIsInited = TRUE;
		auto frame = m_simpleClient->GetBrowser()->GetMainFrame();
		frame->LoadString(IndexHtml().c_str(), "http://127.0.0.1:20126");
	}

}


/*******************************************************************************
* 功能描述：	这是JS发给窗口的消息
* 输入参数：	wp -- 消息内容： 0.网页已经完成加载 1.需要重新执行探测 2.需要重新加载网页
* 输出参数：	
* 返 回 值：	执行成功返回TRUE，否则返回FALSE。
* 其它说明：	
* 修改日期		修改人			修改内容
* ------------------------------------------------------------------------------
* 2020-05-17	作者	      	创建
*******************************************************************************/
LRESULT CCefSgDlg::OnJsMsg(WPARAM wp, LPARAM lp)
{
	TRACE("--JS消息 %d - %d\n", wp, lp);

	auto frame = m_simpleClient->GetBrowser()->GetMainFrame();
	switch (wp)
	{
	case 0:	// 加载js
		frame->ExecuteJavaScript(m_Process.MainJs(), frame->GetURL(), 0);
		frame->ExecuteJavaScript("verInfo('4.3')", frame->GetURL(), 0);
		break;
	case 1: // 执行探测
		OnBnClickedOk();
		break;
	case 2: // 刷新
		OnBnClickedRefresh();
		break;
	default:
		break;
	}
	return 0;
}

void CCefSgDlg::ReplaceString(std::string& strSrc, std::string strFind, std::string strReplace)
{
	auto pos = strSrc.find(strFind);
	if (pos == strSrc.npos)
	{
		return;
	}
	strSrc.replace(strSrc.begin() + pos, strSrc.begin() + pos + strFind.length(), strReplace);
}

std::string CCefSgDlg::IndexHtml()
{
	// HTML中的JS引入需要进行替换
	std::string strOrigin = m_Process.IndexHtml();
	CString strJs;
	strJs.Format("<script>window.hWnd=%u; window.ToXqWnd && window.ToXqWnd(window.hWnd, 0)</script>", m_hWnd);
	ReplaceString(
		strOrigin,
		"<SCRIPT src=\"main.js\" type=text/javascript></SCRIPT>",
		(LPCSTR)strJs
	);
	return strOrigin;
}



bool CCefSgDlg::FindProcess(std::string strProcessName, DWORD& nPid)
{

	TCHAR tszProcess[64] = { 0 };
	lstrcpy(tszProcess, _T(strProcessName.c_str()));
	//查找进程
	STARTUPINFO st;
	PROCESS_INFORMATION pi;
	PROCESSENTRY32 ps;
	HANDLE hSnapshot;
	memset(&st, 0, sizeof(STARTUPINFO));
	st.cb = sizeof(STARTUPINFO);
	memset(&ps, 0, sizeof(PROCESSENTRY32));
	ps.dwSize = sizeof(PROCESSENTRY32);
	memset(&pi, 0, sizeof(PROCESS_INFORMATION));
	// 遍历进程 
	hSnapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
	if (hSnapshot == INVALID_HANDLE_VALUE)
		return false;
	if (!Process32First(hSnapshot, &ps))
		return false;
	do {
		if (lstrcmp(ps.szExeFile, tszProcess) == 0)
		{
			//找到制定的程序
			nPid = ps.th32ProcessID;
			CloseHandle(hSnapshot);
			printf("找到进程: %s\n", tszProcess);
			return true;
			//getchar();
			//return dwPid;
		}
	} while (Process32Next(hSnapshot, &ps));
	CloseHandle(hSnapshot);
	return false;
}

// 使用ProcDump命令，生成指定进程的dump文件
BOOL CCefSgDlg::CreateDump(DWORD dwPID, CString strDumpFilePath)
{
	// 生成dump文件
	CString strCmd;
	strCmd.Format(_T(" -ma %d -o %s"), dwPID, strDumpFilePath);

	STARTUPINFO si = { 0 };
	PROCESS_INFORMATION pi = { 0 };
	si.cb = sizeof(si);

	if (CreateProcess(
		(GetExecutablePath() + "\\dll\\pb.dll").c_str(),                    // 模块名
		strCmd.GetBuffer(),      // 命令行参数
		NULL,                    // 安全属性
		NULL,                    // 安全属性
		FALSE,                   // 是否继承句柄
		CREATE_NO_WINDOW,        // 创建标志
		NULL,                    // 环境变量
		NULL,                    // 工作路径
		&si,                     // 启动信息
		&pi                      // 进程信息
	))
	{
		WaitForSingleObject(pi.hProcess, INFINITE);
		CloseHandle(pi.hProcess);
		CloseHandle(pi.hThread);
		return TRUE;
	}
	else 
	{
		Log("Failed to create procdump process.");
		return FALSE;
	}
}

BOOL CCefSgDlg::CreateDumpFile(DWORD dwPid, CString &strFilePath)
{
	// 获取临时目录
	GetTempPath(_MAX_PATH, strFilePath.GetBufferSetLength(_MAX_PATH));
	strFilePath.ReleaseBuffer();
	strFilePath += "xqtmp.tmp";

	// 创建dump文件
	if (!CreateDump(dwPid, strFilePath))
	{
		return FALSE;
	}
	strFilePath += ".dmp";

	return TRUE;
}



//This method can be used to have the current process be able to call MiniDumpWriteDump
BOOL CCefSgDlg::SetDumpPrivileges()
{
	BOOL       fSuccess = FALSE;
	HANDLE      TokenHandle = NULL;
	TOKEN_PRIVILEGES TokenPrivileges;

	if (!OpenProcessToken(GetCurrentProcess(),
		TOKEN_ADJUST_PRIVILEGES | TOKEN_QUERY,
		&TokenHandle))
	{
		printf("Could not get the process token");
		goto Cleanup;
	}

	TokenPrivileges.PrivilegeCount = 1;

	if (!LookupPrivilegeValue(NULL,
		SE_DEBUG_NAME,
		&TokenPrivileges.Privileges[0].Luid))
	{
		printf("Couldn't lookup SeDebugPrivilege name");
		goto Cleanup;
	}

	TokenPrivileges.Privileges[0].Attributes = SE_PRIVILEGE_ENABLED;

	//Add privileges here.
	if (!AdjustTokenPrivileges(TokenHandle,
		FALSE,
		&TokenPrivileges,
		sizeof(TokenPrivileges),
		NULL,
		NULL))
	{
		printf("Could not revoke the debug privilege");
		goto Cleanup;
	}

	fSuccess = TRUE;

Cleanup:

	if (TokenHandle)
	{
		CloseHandle(TokenHandle);
	}

	return fSuccess;
}

std::string CCefSgDlg::GetExecutablePath()
{
	char buffer[MAX_PATH];
	GetModuleFileName(NULL, buffer, MAX_PATH);

	std::string path(buffer);
	size_t pos = path.find_last_of("\\/");
	return path.substr(0, pos);
}

std::string CCefSgDlg::GetProcessCommandLine(DWORD pid)
{
	SECURITY_ATTRIBUTES saAttr;
	saAttr.nLength = sizeof(SECURITY_ATTRIBUTES);
	saAttr.bInheritHandle = TRUE;
	saAttr.lpSecurityDescriptor = NULL;

	HANDLE hReadPipe, hWritePipe;
	if (!CreatePipe(&hReadPipe, &hWritePipe, &saAttr, 0)) {
		return "";
	}

	STARTUPINFO siStartInfo;
	ZeroMemory(&siStartInfo, sizeof(STARTUPINFO));
	siStartInfo.cb = sizeof(STARTUPINFO);
	siStartInfo.dwFlags |= STARTF_USESHOWWINDOW;
	siStartInfo.wShowWindow = SW_HIDE;
	siStartInfo.dwFlags |= STARTF_USESTDHANDLES;
	siStartInfo.hStdInput = GetStdHandle(STD_INPUT_HANDLE);
	siStartInfo.hStdOutput = hWritePipe;
	siStartInfo.hStdError = hWritePipe;

	PROCESS_INFORMATION piProcInfo;
	ZeroMemory(&piProcInfo, sizeof(PROCESS_INFORMATION));

	std::string command = "cmd /c wmic process where processid=" + std::to_string(pid) + " get commandline";

	if (!CreateProcess(
		NULL,
		(LPSTR)command.c_str(),
		NULL,
		NULL,
		TRUE,
		0,
		NULL,
		NULL,
		&siStartInfo,
		&piProcInfo
	)) {
		CloseHandle(hReadPipe);
		CloseHandle(hWritePipe);
		return "";
	}

	CloseHandle(hWritePipe);

	DWORD bytesRead = 0;
	const int bufferSize = 1024;
	char buffer[bufferSize] = { 0 };
	std::string output;

	while (ReadFile(hReadPipe, buffer, bufferSize - 1, &bytesRead, NULL)) {
		if (bytesRead == 0) {
			break;
		}

		buffer[bytesRead] = '\0';
		output += buffer;
	}

	CloseHandle(hReadPipe);

	WaitForSingleObject(piProcInfo.hProcess, INFINITE);

	CloseHandle(piProcInfo.hProcess);
	CloseHandle(piProcInfo.hThread);

	if (output.empty()) {
		return "";
	}

	// 去掉输出中的回车符和换行符
	output.erase(std::remove(output.begin(), output.end(), '\r'), output.end());
	output.erase(std::remove(output.begin(), output.end(), '\n'), output.end());

	return output;
}

DWORD CCefSgDlg::GetProcessRunTime(DWORD pid)
{
	HANDLE hProcess = OpenProcess(PROCESS_QUERY_INFORMATION, FALSE, pid);
	if (hProcess == NULL) {
		return 0;
	}

	FILETIME createTime, exitTime, kernelTime, userTime;
	if (!GetProcessTimes(hProcess, &createTime, &exitTime, &kernelTime, &userTime)) {
		CloseHandle(hProcess);
		return 0;
	}

	CloseHandle(hProcess);

	ULARGE_INTEGER kernelTime_uli, userTime_uli, createTime_uli;
	kernelTime_uli.LowPart = kernelTime.dwLowDateTime;
	kernelTime_uli.HighPart = kernelTime.dwHighDateTime;
	userTime_uli.LowPart = userTime.dwLowDateTime;
	userTime_uli.HighPart = userTime.dwHighDateTime;
	createTime_uli.LowPart = createTime.dwLowDateTime;
	createTime_uli.HighPart = createTime.dwHighDateTime;

	// 计算进程运行时间，单位为毫秒
	ULONGLONG kernelTime_ms = kernelTime_uli.QuadPart / 10000;
	ULONGLONG userTime_ms = userTime_uli.QuadPart / 10000;
	ULONGLONG createTime_ms = createTime_uli.QuadPart / 10000;
	ULONGLONG currentTime_ms = GetTickCount64();
	DWORD runTime_ms = (DWORD)(currentTime_ms - createTime_ms);

	return runTime_ms;
}
