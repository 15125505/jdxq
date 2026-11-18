// CLoadingDlg.cpp: 实现文件
//

#include "pch.h"
#include "CefSg.h"
#include "CLoadingDlg.h"
#include "afxdialogex.h"
#include "Process.h"


// CLoadingDlg 对话框

IMPLEMENT_DYNAMIC(CLoadingDlg, CDialogEx)

CLoadingDlg::CLoadingDlg(CWnd* pParent /*=nullptr*/)
	: CDialogEx(IDD_LOADING_DIALOG, pParent)
{
	m_hThread = NULL;
	m_bChange = false;
}

CLoadingDlg::~CLoadingDlg()
{
}

void CLoadingDlg::DoDataExchange(CDataExchange* pDX)
{
	CDialogEx::DoDataExchange(pDX);
}


BEGIN_MESSAGE_MAP(CLoadingDlg, CDialogEx)
	ON_BN_CLICKED(IDOK, &CLoadingDlg::OnBnClickedOk)
	ON_BN_CLICKED(IDCANCEL, &CLoadingDlg::OnBnClickedCancel)
	ON_WM_TIMER()
END_MESSAGE_MAP()


// CLoadingDlg 消息处理程序


BOOL CLoadingDlg::OnInitDialog()
{
	CDialogEx::OnInitDialog();


	// 启动干活的线程
	m_hThread = AfxBeginThread(TH_Work, this)->m_hThread;

	// 启动状态显示的定时器
	SetTimer(1, 50, NULL);

	// 设置窗口标题
	SetWindowText("小仙");

	return TRUE;  // 除非将焦点设置到控件，否则返回 TRUE
}

void CLoadingDlg::OnBnClickedOk()
{
}

void CLoadingDlg::OnBnClickedCancel()
{
	if (NULL != m_hThread)
	{
		return;
	}
	OnCancel();
}

void CLoadingDlg::OnTimer(UINT_PTR nIDEvent)
{
	CDialog::OnTimer(nIDEvent);
	m_csLock.Lock();
	CString strState = m_strState;
	if (m_bChange)
	{
		SetDlgItemText(IDC_STATE, m_strState);
		SetWindowText(strState);
		m_bChange = false;
	}
	m_csLock.Unlock();
	if (NULL == m_hThread)
	{
		if (strState == "完成！")
		{
			OnOK();
		}
		else
		{
			GetDlgItem(IDCANCEL)->EnableWindow();
		}
	}
}

UINT CLoadingDlg::TH_Work(LPVOID lp)
{
	CLoadingDlg* pThis = (CLoadingDlg*)lp;
	pThis->Work();
	pThis->m_hThread = NULL;
	return 0;
}


void CLoadingDlg::Work()
{
	// 获取启动码
	UpdateState("正在启动...");
	CString strErr;
	int nRet = m_Proccess.GetCode();
	if (nRet != 0)
	{
		strErr.Format("启动...出错：%d", nRet);
		UpdateState(strErr);
		return;
	}

	// 更新配置
	UpdateState("正在启动....");
	nRet = m_Proccess.UpdateIndex();
	if (nRet != 0)
	{
		strErr.Format("启动....出错：%d", nRet);
		UpdateState(strErr);
		return;
	}
	UpdateState("正在启动.....");
	nRet = m_Proccess.UpdateMain();
	if (nRet != 0)
	{
		strErr.Format("启动.....出错：%d", nRet);
		UpdateState(strErr);
		return;
	}

	UpdateState("完成！");

}

void CLoadingDlg::UpdateState(CString strState)
{
	m_csLock.Lock();
	m_strState = strState;
	m_bChange = true;
	m_csLock.Unlock();
}
