using System;
using System.Drawing;
using System.Runtime.InteropServices;

namespace GazeServer
{
    /// <summary>
    /// Taken from <a href="https://stackoverflow.com/a/21450169/2361752">StackOverflow</a>.
    /// </summary>
    internal static class DPIHelper
    {
        [DllImport("gdi32.dll")]
        private static extern int GetDeviceCaps(IntPtr hdc, int nIndex);

        /// <summary>
        /// See <a href="http://pinvoke.net/default.aspx/gdi32/GetDeviceCaps.html">GetDeviceCaps</a>.
        /// </summary>
        private enum DeviceCap
        {
            VERTRES = 10,
            DESKTOPVERTRES = 117
        }

        public static float GetScreenScale()
        {
            var g = Graphics.FromHwnd(IntPtr.Zero);
            var desktop = g.GetHdc();
            var logicalScreenHeight = GetDeviceCaps(desktop, (int)DeviceCap.VERTRES);
            var physicalScreenHeight = GetDeviceCaps(desktop, (int)DeviceCap.DESKTOPVERTRES);

            var scale = physicalScreenHeight / (float)logicalScreenHeight;
            return scale;
        }
    }
}
