#pragma once

#include "include/cef_client.h"
#include "include/cef_app.h"
#include "include/cef_download_handler.h" 
class CSimpleClient : 
	public CefClient, 
	public CefLifeSpanHandler,
	public CefKeyboardHandler, 
	public CefContextMenuHandler, 
	public CefBrowserProcessHandler, 
	public CefApp, 
	public CefDownloadHandler, 
	public CefLoadHandler, 
	public CefRenderProcessHandler
{
public:
	CSimpleClient(HWND hWnd);
	~CSimpleClient();

	virtual CefRefPtr<CefRenderProcessHandler> GetRenderProcessHandler()
		OVERRIDE {
		return this;
	}

	virtual void OnContextCreated(CefRefPtr<CefBrowser> browser, CefRefPtr<CefFrame> frame, CefRefPtr<CefV8Context> context) OVERRIDE;


	virtual bool OnBeforePopup(CefRefPtr<CefBrowser> browser,//不弹对话框
		CefRefPtr<CefFrame> frame,
		const CefString& target_url,
		const CefString& target_frame_name,
		WindowOpenDisposition target_disposition,
		bool user_gesture,
		const CefPopupFeatures& popupFeatures,
		CefWindowInfo& windowInfo,
		CefRefPtr<CefClient>& client,
		CefBrowserSettings& settings,
		bool* no_javascript_access) override;

	void OnBeforeCommandLineProcessing(const CefString& process_type, CefRefPtr<CefCommandLine> command_line);

	virtual CefRefPtr<CefLifeSpanHandler> GetLifeSpanHandler() OVERRIDE
	{
		return this;
	}
	/*
	download
	*/
	virtual CefRefPtr<CefDownloadHandler> GetDownloadHandler() { return this; }
	virtual void OnBeforeDownload(
		CefRefPtr<CefBrowser> browser,
		CefRefPtr<CefDownloadItem> download_item,
		const CefString& suggested_name,
		CefRefPtr<CefBeforeDownloadCallback> callback) OVERRIDE;
	virtual void OnDownloadUpdated(
		CefRefPtr<CefBrowser> browser,
		CefRefPtr<CefDownloadItem> download_item,
		CefRefPtr<CefDownloadItemCallback> callback) OVERRIDE;

	// CefLifeSpanHandler methods:
	virtual void OnAfterCreated(CefRefPtr<CefBrowser> browser) OVERRIDE;

	CefRefPtr<CefBrowser> GetBrowser() { return m_cefBrowser; }

private:
	HWND m_hWnd;
	CefRefPtr<CefBrowser> m_cefBrowser;
	IMPLEMENT_REFCOUNTING(CSimpleClient);
};