// xq_cmd.cpp: 定义应用程序的入口点。
//

#include "xq_cmd.h"
#include "ProcInfo.h"
#include <unistd.h>

using namespace std;

int main()
{
	ProcInfo p;
	p.Test();
	return 0;
}
