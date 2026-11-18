#include "pch.h"
#include "SimpleV8Handler.h"
#include "MsgPool.h"

#define WM_JS_MSG (WM_USER + 1234)


bool CSimpleV8Handler::Execute(const CefString& name, CefRefPtr<CefV8Value> object, const CefV8ValueList& arguments,
	CefRefPtr<CefV8Value>& retval, CefString& exception)
{
	if (name != CefString("ToXqWnd"))
	{
		return false;
	}
	if (arguments.size() == 2 && arguments[0]->IsUInt() && arguments[1]->IsUInt())
	{
		HWND hWnd = (HWND)arguments[0]->GetUIntValue();
		::PostMessage(hWnd, WM_JS_MSG, arguments[1]->GetUIntValue(), 0);
	}
	else if (arguments.size() == 1 && arguments[0]->IsString())
	{
		MsgPool::AddMsg(arguments[0]->GetStringValue().c_str());
	}
	return true;
}
